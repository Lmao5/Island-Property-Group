const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')

router.get('/', (req, res) => {
  const title = 'Home'
  res.render('index', { title: title })
})

router.get('/about', (req, res) => {
  const title = 'About Us'
  res.render('about', { title: title })
})

router.get('/contact', (req, res) => {
  const title = 'Contact Us'
  res.render('contact', { title: title })
})

// Test api call here
router.get('/testRoute', (req, res) => {
  const body = {
    a: 10,
    b: 5
  }
  fetch('http://localhost:8000/api/test', {
    method: 'post',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  })
    .then(res => res.json())
    .then(json =>
      res.send(json))
})

module.exports = router