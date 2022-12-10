let isYtVideoPlaying = false
let isInitialLoad = true
window.initVideo = function ({ el = 'ytEmbed', autoEmbed = true, videoId, httpMethod = 'post', httpUrl, httpPayload = {}, watchSeconds = 0, isLive = false, autoplay = false } = {}) {
  const startMuted = isLive || autoplay
  const bodyContent = document.querySelector('.body-content')
  
  if (isLive) {
    autoplay = true
  }

  if (!autoplay) {
    autoplay = window.$params.autoplay ?? 0
  }

  if (autoplay) {
    onInitVideo(true, watchSeconds)
    return
  }
  
  if (autoEmbed) {
    onInitVideo(false, watchSeconds)
  }

  const element = document.getElementById(el)

  bodyContent?.addEventListener('click', (event) => {
    const isTarget = event.target.classList.contains('timestamp')
    const containsTarget = event.target.closest('.timestamp')
    
    if (isTarget || containsTarget) {
      const target = isTarget ? event.target : event.target.closest('.timestamp')
      const displayDuration = target.textContent
      const splits = displayDuration.split(':')
      let duration = splits[splits.length]

      if (splits.length > 1) {
        duration = splits.reduce((x, s, i) => {
          return i == splits.length -1 ? x + parseInt(s) : x + (parseInt(s) * 60)
        }, 0)
      }

      if (window.player) {
        window.player.seekTo(duration)
      } else {
        onInitVideo(true, duration)
      }

      window.scrollTo({
        top: element.offsetTop,
        behavior: 'smooth'
      })
    }
  })

  element.addEventListener('click', () => {
    element.removeEventListener('click', onInitVideo)
    onInitVideo(true, watchSeconds)
  })

  function onInitVideo(playOnReady, skipToSeconds = watchSeconds) {
    window.onYouTubeIframeAPIReady = function () {
      const playerVars = {
        autoplay: playOnReady,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        ecver: 2,
        start: skipToSeconds
      }

      if (isLive) {
        delete playerVars.start
      }

      window.player = new YT.Player(el, {
        videoId: videoId,
        playerVars,
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange
        }
      })
    }

    if (isInitialLoad) {
      const tag = document.createElement('script')
      const appCompleted = document.getElementById('appCompleted')

      let playerInterval
      tag.src = "https://www.youtube.com/iframe_api"
      document.body.appendChild(tag)
      isInitialLoad = false
    } else {
      window.onYouTubeIframeAPIReady() 
    }

    function onPlayerReady(event) {
      // setTimeout(() => player.pauseVideo(), 500)
      // setTimeout(() => player.seekTo(300), 500)
      if (startMuted) {
        event.target.mute()
      }
    }

    function onPlayerStateChange(event) {
      isYtVideoPlaying = event.data == YT.PlayerState.PLAYING

      if (isLive) return

      if (isYtVideoPlaying) {
        playerInterval = setInterval(async () => {
          const currentTime = window.player.getCurrentTime()
          const duration = window.player.getDuration()

          // duration may be 0 if meta data is still loading
          if (duration !== 0) {
            await storeWatchingProgression(currentTime, duration)
          }
        }, 15000)
      } else {
        const currentTime = window.player.getCurrentTime()
        const duration = window.player.getDuration()

        clearInterval(playerInterval)
        storeWatchingProgression(currentTime, duration)
      }
    }

    async function storeWatchingProgression(currentTime, duration) {
      const watchPercent = Math.floor(currentTime / duration * 100)
      const { data } = await axios[httpMethod](httpUrl, {
        ...httpPayload,
        watchPercent,
        watchSeconds: Math.floor(currentTime)
      })

      const isCompleted = data.progression.isCompleted
      const event = new CustomEvent('completed', { detail: { isCompleted } })
      appCompleted.dispatchEvent(event)
    }
  }
}

let lessonVideoIntersection
let lessonVideoResize
let wasIntersecting = undefined

up.compiler('#lessonVideoEmbed', function(element) {
  const data = element.dataset
  
  // re-position to primary position when re-initialized
  positionVideoPlaceholder()

  // kick-off video initialization
  initVideo({
    el: 'lessonVideoEmbed',
    isLive: !!data.isLive && data.isLive !== 'null',
    videoId: data.videoId,
    watchSeconds: parseInt(data.watchSeconds || '0'),
    httpUrl: data.httpUrl,
    httpPayload: {
      postId: data.payloadPostId,
      collectionId: data.payloadCollectionId,
      userId: data.payloadUserId,
      route: data.payloadRoute
    }
  })

  if (!!window.ResizeObserver) {
    let observer = new ResizeObserver((entries) => {
      if (typeof wasIntersecting !== 'undefined') {
        positionVideoPlaceholder(!wasIntersecting)
      }
    })

    observer.observe(document.body)
    lessonVideoResize = () => observer.unobserve(document.body)
  }
})

up.compiler('#videoPlayerPosition', position => {
  if (typeof lessonVideoIntersection == 'function') {
    lessonVideoIntersection()
  }

  // move to small position when primary position is out of view
  if(!!window.IntersectionObserver) {
    let observer = new IntersectionObserver((entries) => { 
      entries.forEach(entry => {
        wasIntersecting = entry.isIntersecting
        positionVideoPlaceholder(!entry.isIntersecting)
      });
    }, { rootMargin: "0px" });

    observer.observe(position)
    lessonVideoIntersection = () => observer.unobserve(position)
  }
})

// change to small player if the page doesn't contain it's positioning element
up.on('up:fragment:loaded', event => {
  const isSmallPlayer = !event.response.text.includes('id="videoPlayerPosition"')
  positionVideoPlaceholder(isSmallPlayer)
})

function positionVideoPlaceholder(isSmallPlayer = false) {
  const placeholder = document.getElementById('videoPlayerPlaceholder')
  const videoPath = placeholder.dataset.path
  const isVideoPath = videoPath == location.pathname
  
  if (isSmallPlayer) {
    isVideoPath
      ? placeholder.classList.add('video-noactions')
      : placeholder.classList.remove('video-noactions')

    placeholder.classList.add('video-small')
    placeholder.classList.remove('aspect-video')
    placeholder.removeAttribute('style')
    
    return    
  }

  const position = document.getElementById('videoPlayerPosition')
  const rect = offset(position)

  if (!rect) return

  placeholder.classList.add('aspect-video')
  placeholder.classList.remove('video-small', 'video-noactions')
  placeholder.style.position = 'absolute'
  placeholder.style.padding = 0
  placeholder.style.width = rect.width + 'px'
  placeholder.style.hight = rect.height + 'px'
  placeholder.style.left = rect.left + 'px'
  placeholder.style.top = rect.top + 'px'
}

function offset(el) {
  if (!el) return
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height
  };
}

// scroll active series item into view
// document.querySelector('ol li a.active').scrollIntoView({
//   behavior: 'smooth',
//   block: 'nearest',
//   inline: 'start'
// })

// window.initProgression = function ({ storeProgression = false, httpMethod = 'post', httpUrl, httpPayload }) {
//   const post = document.querySelector(".body-content .prose")
//   const progress = document.getElementById("reading-progress")
//   const appCompleted = document.getElementById('appCompleted')
//   let inViewport = false
//   let intersectionY = 0

//   let observer = new IntersectionObserver(handler)

//   observer.observe(post)

//   function handler(entries, observer) {
//     for (entry of entries) {
//       intersectionY = entry.boundingClientRect.y

//       if (entry.isIntersecting) {
//         inViewport = true
//       } else {
//         inViewport = false
//       }
//     }
//   }

//   /* Get the percentage scrolled of an element. It does not change if its not in view.*/
//   function getScrollProgress(el) {
//     let progressPercentage = 0

//     if (inViewport || intersectionY < 0) {
//       let coords = el.getBoundingClientRect()
//       let height = coords.height

//       if(coords.top < 0){
//         progressPercentage = (Math.abs(coords.top) / height) * 100
//       }
//     }

//     return progressPercentage
//   }

//   /* Set the reading aside using the value attribute*/
//   function showReadingProgress() {
//     const scrollProgress = getScrollProgress(post)

//     progress.setAttribute("value", scrollProgress)

//     scrollProgress > 0
//       ? progress.classList.remove('hidden')
//       : progress.classList.add('hidden')

//     scrollProgress >= 93
//       ? progress.classList.add('is-complete')
//       : progress.classList.remove('is-complete')

//     return scrollProgress
//   }

//   async function storeReadingProgression(scrollProgress) {
//     if (!storeProgression) return
//     const readPercent = Math.floor(scrollProgress)
//     const { data } = await axios[httpMethod](httpUrl, { ...httpPayload, readPercent })
//     const isCompleted = data.progression.isCompleted
//     const event = new CustomEvent('completed', { detail: { isCompleted } })
//     appCompleted.dispatchEvent(event)
//   }

//   /* Use requestAnimationFrame*/
//   var timeout
//   var saveTimeout
//   var lastScrollProgress = 0

//   window.onscroll = function () {
//     if (timeout) {
//       window.cancelAnimationFrame(timeout)
//     }

//     if (saveTimeout) {
//       clearTimeout(saveTimeout)
//     }

//     timeout = window.requestAnimationFrame(function () {
//       // Run our scroll functions
//       lastScrollProgress = showReadingProgress()
//     });

//     saveTimeout = setTimeout(() => storeReadingProgression(lastScrollProgress), 1500)
//   }
// }

const postAnchorLinks = Array.from(document.querySelectorAll('.body-content > .prose h1[id], .body-content > .prose h2[id], .body-content > .prose h3[id], .body-content > .prose h4[id], .body-content > .prose h5[id], .body-content > .prose h6[id]'))
postAnchorLinks.map(heading => {
  const anchor = document.createElement('a')
  anchor.setAttribute('aria-hidden', 'true')
  anchor.setAttribute('tabindex', '-1')
  anchor.setAttribute('href', `#${heading.id}`)
  anchor.setAttribute('class', 'hidden md:block md:absolute md:-left-8 top-2 opacity-0 group-hover:opacity-100 text-gray-700 duration-300')
  anchor.innerHTML = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z" clip-rule="evenodd"></path></svg>`
  heading.classList.add('relative')
  heading.classList.add('group')
  heading.appendChild(anchor)
})

const transcriptBtn = document.getElementById('transcriptCutoffBtn')
const transcriptCutoff = Array.from(document.querySelectorAll('.prose .transcript.cutoff'))
if (transcriptBtn && transcriptCutoff.length) {
  transcriptBtn.addEventListener('click', (event) => {
    transcriptBtn.parentElement.classList.toggle('active')
    transcriptCutoff.map(el => el.classList.toggle('active'))
  })
}