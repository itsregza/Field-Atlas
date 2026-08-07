(function () {
  var path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path !== '/') return

  var pool = [
    '/heroes/lakes-wasdale.jpg',
    '/heroes/lakes-langdale.jpg',
    '/heroes/peak-kinder.jpg',
    '/heroes/glencoe-buachaille.jpg',
    '/heroes/jacobs-ladder.jpeg',
    '/heroes/y-garn.jpeg',
    '/heroes/kinder.jpeg',
    '/heroes/kinderclouds.jpeg',
    '/heroes/greengable1.jpeg',
  ]
  var lastKey = 'field-atlas:last-hero'
  var bootKey = 'field-atlas:boot-hero'

  var last = ''
  try {
    last = sessionStorage.getItem(lastKey) || ''
  } catch (e) {}

  var choices = pool.filter(function (src) {
    return src !== last
  })
  var boot = choices[Math.floor(Math.random() * choices.length)] || pool[0]

  try {
    sessionStorage.setItem(lastKey, boot)
    sessionStorage.setItem(bootKey, boot)
  } catch (e) {}

  var link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = boot
  link.setAttribute('fetchpriority', 'high')
  document.head.appendChild(link)

  var img = new Image()
  img.src = boot

  var root = document.getElementById('root')
  if (root) {
    root.style.minHeight = '100vh'
    root.style.backgroundColor = '#2a3124'
    root.style.backgroundImage = 'url("' + boot + '")'
    root.style.backgroundSize = 'cover'
    root.style.backgroundPosition = 'center'
    root.style.backgroundRepeat = 'no-repeat'
  }
})()
