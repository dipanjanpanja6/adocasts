import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import ProfileValidator from 'App/Validators/ProfileValidator'
import { chain } from 'mathjs'

export default class ProfilesController {
  public async index({}: HttpContextContract) {}

  public async create({}: HttpContextContract) {}

  public async store({}: HttpContextContract) {}

  public async show({ view, params }: HttpContextContract) {
    const username = params.username.replace(/^@/, '')
    const user = await User.query()
      .whereILike('username', username)
      .preload('profile')
      .firstOrFail()

    const completedLessonsCount = await user.related('completedPosts').query().getCount()
    const commentCount = await user.related('comments').query().getCount()
    const secondsWatchedSum = await user.related('watchedPosts').query().getSum('watch_seconds')
    const hoursWatchedSum = chain(secondsWatchedSum).divide(3600).done()

    return view.render('pages/profiles/show', { user, completedLessonsCount, commentCount, hoursWatchedSum })
  }

  public async edit({}: HttpContextContract) {}

  public async update({ request, response, auth, session }: HttpContextContract) {
    const data = await request.validate(ProfileValidator)
    
    await auth.user!.related('profile').query().update(data)

    session.flash('success', 'Your profile has been successfully updated')
    
    return response.redirect().back()
  }

  public async destroy({}: HttpContextContract) {}
}
