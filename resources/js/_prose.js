up.compiler('#proseBody', function (el) {
  const postAnchorLinks = Array.from(el.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'))
  postAnchorLinks.map(heading => {
    const anchor = document.createElement('a')
    anchor.setAttribute('aria-hidden', 'true')
    anchor.setAttribute('tabindex', '-1')
    anchor.setAttribute('href', `#${heading.id}`)
    anchor.setAttribute('class', 'hidden md:block md:absolute md:-left-8 top-2 opacity-0 group-hover:opacity-100 text-slate-500 duration-300')
    anchor.innerHTML = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z" clip-rule="evenodd"></path></svg>`
    heading.classList.add('relative')
    heading.classList.add('group')
    heading.appendChild(anchor)
  })
})

window.onTranscriptToggle = function() {
  const transcriptBtn = document.getElementById('transcriptCutoffBtn')
  const transcriptCutoff = Array.from(document.querySelectorAll('.prose .transcript.cutoff'))
  transcriptBtn.parentElement.classList.toggle('active')
  transcriptCutoff.map(el => el.classList.toggle('active'))
}