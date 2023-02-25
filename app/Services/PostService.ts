import PostTypes from "App/Enums/PostTypes"
import Post from "App/Models/Post"
import Route from '@ioc:Adonis/Core/Route'
import AnalyticsService from "./AnalyticsService"
import { ModelPaginatorContract } from "@ioc:Adonis/Lucid/Orm"
import { AuthContract } from "@ioc:Adonis/Addons/Auth"
import States from "App/Enums/States"

export default class PostService {
  /**
   * returns latest published posts in designated post types
   * @param limit 
   * @param excludeIds 
   * @param postTypeIds 
   * @returns 
   */
  public static async getLatest(limit: number = 10, excludeIds: number[] = [], postTypeIds: PostTypes[] = [PostTypes.LESSON, PostTypes.NEWS, PostTypes.LIVESTREAM, PostTypes.BLOG]): Promise<Post[]> {
    return Post.query()
      .apply(scope => scope.forDisplay())
      .if(Array.isArray(postTypeIds),
        query => query.where(q => (<number[]>postTypeIds).map(postTypeId => q.orWhere({ postTypeId }))),
        query => query.where({ postTypeId: postTypeIds })
      )
      .if(excludeIds.length, query => query.whereNotIn('id', excludeIds))
      .orderBy('publishAt', 'desc')
      .limit(limit)
  }

  /**
   * return most viewed posts from the past month
   * @param limit 
   * @returns 
   */
  public static async getTrending(limit: number = 10): Promise<Post[]> {
    const slugs = await AnalyticsService.getPastMonthsPopularContentSlugs(limit)
    return Post.query()
      .apply(scope => scope.forDisplay())
      .whereIn('slug', slugs)
      .orderBy('publishAt', 'desc')
  }

  /**
   * returns post with the given slug
   * @param slug 
   * @param postTypeId 
   * @returns 
   */
  public static async getBySlug(slug: string, postTypeId: PostTypes): Promise<Post> {
    return Post.query()
        .if(postTypeId, query => query.where({ postTypeId }))
        .apply(scope => scope.forDisplay(true))
        .where({ slug })
        .highlightOrFail()
  }

  /**
   * 
   * @param page 
   * @param limit 
   * @param sortBy 
   * @param sortDir 
   * @param postTypeId 
   * @param baseUrl 
   * @returns 
   */
  public static async getPaginated(page: number, limit: number, sortBy: string, sortDir: 'asc'|'desc', postTypeId: PostTypes = PostTypes.LESSON, baseUrl: string): Promise<ModelPaginatorContract<Post>> {
    const items = await Post.query()
      .where({ postTypeId })
      .apply(scope => scope.forDisplay())
      .orderBy(sortBy, sortDir)
      .paginate(page, limit)

    items.baseUrl(baseUrl)

    return items
  }

  /**
   * returns the lastest published active livestream (if there is one)
   * @returns 
   */
  public static async getActiveStream(): Promise<Post | null> {
    return await Post.livestreams()
      .apply(scope => scope.forDisplay())
      .whereTrue('isLive')
      .whereNotNull('livestreamUrl')
      .orderBy('publishAt', 'desc')
      .first()
  }

  /**
   * returns related root series for post
   * @param auth 
   * @param post 
   * @returns 
   */
  public static async getSeries(auth: AuthContract, post: Post) {
    return post.related('rootSeries').query()
      .wherePublic()
      .preload('posts', query => query
        .apply(scope => scope.forCollectionDisplay())
        .if(auth.user, query => query.preload('progressionHistory', query => query.where({ userId: auth.user!.id }).orderBy('updated_at', 'desc'))))
      .preload('children', query => query
        .wherePublic()
        .preload('posts', query => query
          .apply(scope => scope.forCollectionDisplay())
          .if(auth.user, query => query.preload('progressionHistory', query => query.where({ userId: auth.user!.id }).orderBy('updated_at', 'desc')))
        )
      )
      .preload('updatedVersions', query => query
        .wherePublic()
        .whereHas('postsFlattened', query => query.apply(s => s.published()))
      )
      .first()
  }

  /**
   * returns comments for post
   * @param auth 
   * @param post 
   * @returns 
   */
  public static async getComments(post: Post) {
    return post.related('comments').query()
      .where(query => query.wherePublic().orWhere('stateId', States.ARCHIVED))
      .preload('user')
      .preload('userVotes', query => query.select(['id']))
      .orderBy('createdAt', 'desc')
      .highlightAll()
  }

  /**
   * returns a count of the comments tied to the post
   * @param post 
   * @returns 
   */
  public static async getCommentsCount(post: Post) {
    return post.related('comments').query()
      .wherePublic()
      .getCount()
  }

  /**
   * returns correct path url for the provided post's post type
   * @param post 
   * @param params 
   * @param options 
   * @returns 
   */
  public static getPostPath(post: Post, params: { [x: string]: any }, options: { [x: string]: any }) {
    params = { ...params, slug: post.slug }
  
    switch(post.postTypeId) {
      case PostTypes.LESSON:
        return Route.makeUrl('lessons.show', params, options)
      case PostTypes.BLOG:
        return Route.makeUrl('posts.show', params, options)
      case PostTypes.NEWS:
        return Route.makeUrl('news.show', params, options)
      case PostTypes.LIVESTREAM:
        return Route.makeUrl('streams.show', params, options)
      case PostTypes.LINK:
        return post.redirectUrl
    }
  }
}