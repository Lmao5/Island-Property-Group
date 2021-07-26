const ensureUserAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    // Process to next statement if user is authenticated
    return next()
  }
  // If user is not authenticated
  // Return user to home page
  else {
    res.redirect('/')
  }
}

const checkNotAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  } else {
    next()
  }
}

module.exports = { ensureUserAuthenticated, checkNotAuthenticated }
