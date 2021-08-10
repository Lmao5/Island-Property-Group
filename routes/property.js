const express = require('express')
const router = express.Router()

// Models
const hdbResale = require('../models/hdbResale')
const privateResale = require('../models/PrivateResale')

// Required node modules
const uuid = require('uuid')
const fetch = require('node-fetch')

// Base URL String
const baseAPIUrl = process.env.baseAPIUrl || 'http://localhost:8000/api/'

const floorRangeSelector = require('../helpers/floorRangeSelector')

// Middlewares
const { checkUUIDFormat, checkResalePublicListingId } = require('../helpers/checkURL')
const { checkAgentAuthenticated } = require('../helpers/auth')

// Call predict resale API for HDB properties
async function predictPublicResale (dateOfSale, town, flatType,
  floorRange, floorSqm, flatModel, leaseStartDate) {
  const body = {
    type: 'public',
    resale_date: dateOfSale,
    town: town,
    flat_type: flatType,
    storey_range: floorRange,
    floor_area_sqm: floorSqm,
    flat_model: flatModel,
    lease_commence_date: leaseStartDate
  }
  return new Promise((result, err) => {
    fetch(baseAPIUrl + 'predictResale', {
      method: 'post',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res =>
        res.json()
      )
      .then((json) => {
        console.log(json)
        result(json)
      })
      .catch((err) => {
        console.log('Error:', err)
      })
  })
}

// TESTING
// function displayPriceDiff (perDiff) {
//   // If percentage diff is more than 2%
//   if (perDiff > 2) {
//     return "positive"
//   }
//   // If percentage diff is more than -2%
//   else if (perDiff < -2) {
//     return "negative"
//   }
//   else{
//     return "equal"
//   }
// }

// Router is placed according to CRUD order where you'll see create function then followed by retrieve and etc

// Reference
router.get('/propertysingle', (req, res) => {
  const title = 'Property Single'
  res.render('publicResale/property-single', { title })
})

router.get('/propertylist', (req, res) => {
  const title = 'List of Properties'
  res.render('publicResale/property-grid', { title })
})

// Show create HDB Resale Page
router.get('/create', checkAgentAuthenticated, (req, res) => {
  const title = 'Create HDB Resale Listing'
  res.render('publicResale/createListing', { title })
})

// Fixed data for testing
router.post('/create', checkAgentAuthenticated, (req, res) => {
  const filterSpecialRegex = /[-!$%^&*()_+|~=`{}\[\]:";'<>?,.\/]/
  // Inputs
  const id = uuid.v4()
  const address = req.body.address
  const blockNo = req.body.blockNo
  const description = req.body.description
  const postalCode = req.body.postalCode
  const town = req.body.town
  const flatType = req.body.flatType
  const flatModel = req.body.flatModel
  const flatLevel = req.body.flatLevel
  const usePrediction = req.body.usePrediction
  console.log('Use AI: ', usePrediction)

  // Call floor range selector to select floor range from floor level accordingly
  const floorRange = floorRangeSelector(req.body.flatLevel)
  const floorSqm = req.body.floorSqm

  // Date related inputs
  const leaseCommenceDate = new Date(req.body.leaseCommenceDate)
  const leaseStartYear = leaseCommenceDate.getFullYear()
  const resaleDate = new Date(req.body.dateOfSale)

  // Will add input validation here later
  // Input Validation
  // if (filterSpecialRegex.test(address) === false) {
  //   return console.log('Address contains special characters')
  // }
  // if (filterSpecialRegex.test(description) === false) {
  //   return console.log('Description contains special characters')
  // }
  // if (filterSpecialRegex.test(address) === false) {
  //   return console.log('Address contains special characters')
  // }
  // if (filterSpecialRegex.test(address) === false) {
  //   return console.log('Address contains special characters')
  // }

  // Check if resale date is at least 5 years from lease commence date
  const totalMilisecondsPerDay = 1000 * 60 * 60 * 24
  const yearDiff = ((resaleDate - leaseCommenceDate) / totalMilisecondsPerDay) / 365
  if (yearDiff < 5) {
    return console.log('Ensure that resale date is at least 5 years from lease date')
  }

  // Call predicting api for public resale housing
  const resaleValue = predictPublicResale(resaleDate, town, flatType, floorRange, floorSqm, flatModel, leaseStartYear)
  resaleValue.then((response) => {
    console.log('Resale Value', response)

    // Replace fixed value of sample description
    const description = 'Sample Description'
    const predictedValue = Math.round(response)
    // If user wants to display prediction from AI
    if (Boolean(usePrediction) === true) {
      // Create public resale listing
      hdbResale
        .create({
          id,
          address,
          blockNo,
          description,
          resalePrice: predictedValue,
          predictedValue,
          town,
          flatType,
          flatModel,
          flatLevel,
          floorSqm,
          leaseCommenceDate,
          resaleDate,
          postalCode,
          isViewable: false,
          usePrediction
        })
        .then(() => {
          console.log('Created HDB Resale Listing')
          // Redirect to confirming property page
          res.redirect('confirmPublicResaleListing/' + id)
        })
        .catch((err) => console.log('Error in creating HDB Resale Listing: ' + err))
    } else {
      // If we want to display entered resale value instead of predicted value
      // Save resale value input and display it
      const resalePrice = Math.round(req.body.resaleValue)
      hdbResale
        .create({
          id,
          address,
          blockNo,
          description,
          resalePrice,
          predictedValue,
          town,
          flatType,
          flatModel,
          flatLevel,
          floorSqm,
          leaseCommenceDate,
          resaleDate,
          postalCode,
          isViewable: false,
          usePrediction
        })
        .then(() => {
          console.log('Created HDB Resale Listing')
          // Redirect to confirming property page
          res.redirect('confirmPublicResaleListing/' + id)
        })
        .catch((err) => console.log('Error in creating HDB Resale Listing: ' + err))
    }
  })
})

// View individual HDB Resale Page
router.get('/viewPublicResaleListing/:id', checkUUIDFormat, checkResalePublicListingId, (req, res) => {
  const title = 'HDB Resale Listing'

  // Refer to mysql workbench for all property id
  const id = req.params.id
  hdbResale
    .findOne({
      where: {
        id
      }
    })
    // Display information regarding this HDB property
    .then((hdbResaleDetail) => {
      const resalePrice = Math.round(hdbResaleDetail.resalePrice)
      const predictedValue = Math.round(hdbResaleDetail.predictedValue)
      const address = hdbResaleDetail.address
      const blockNo = hdbResaleDetail.blockNo
      const town = hdbResaleDetail.town
      const flatType = hdbResaleDetail.flatType
      const floorSqm = hdbResaleDetail.floorSqm
      const description = hdbResaleDetail.description
      const leaseCommenceDate = hdbResaleDetail.leaseCommenceDate
      const usePrediction = hdbResaleDetail.usePrediction
      const postalCode = hdbResaleDetail.postalCode

      // Calculate percentage differences and
      // round off to 2 decimal places
      const percentagePriceDifference = (((resalePrice - predictedValue) / predictedValue) * 100).toFixed(2)

      res.render('publicResale/viewListing', {
        id,
        address,
        blockNo,
        title,
        resalePrice,
        predictedValue,
        percentagePriceDifference,
        town,
        flatType,
        floorSqm,
        description,
        leaseCommenceDate,
        usePrediction,
        postalCode
      })
    })
    .catch((err) => {
      console.log('Error in displaying HDB Resale Listing: ', err)
    })
})

// HDB Properties that are currently viewable to customers can be found here
router.get('/viewPublicResaleList', (req, res) => {
  const title = 'HDB Resale'
  const isViewable = true
  const isPublic = true
  hdbResale.findAll({
    // Only users can see viewable properties
    where: {
      isViewable
    },
    raw: true
  }).then((hdbResale) => {
    res.render('publicResale/list', { title, hdbResale, isViewable, isPublic })
  })
})

// Unviewable property listings that customers cannot see
router.get('/viewPreviewPublicList', checkAgentAuthenticated, (req, res) => {
  const title = 'HDB Preview Resale'
  const isPublic = false
  hdbResale.findAll({
    // Only agents can see all properties
    raw: true
  }).then((hdbResale) => {
    res.render('publicResale/list', { title, hdbResale, isPublic })
  })
})

// Edit Function for public resale listings
router.get('/edit/:id', checkAgentAuthenticated, checkUUIDFormat, checkResalePublicListingId, (req, res) => {
  const title = 'Edit HDB Resale Listing'

  // Get UUID from URL
  const id = req.params.id
  // Find hdb property by id
  hdbResale.findOne({
    where: { id }
  }).then((result) => {
    // Display result from database
    const resalePrice = result.resalePrice
    const predictedValue = result.predictedValue
    const address = result.address
    const blockNo = result.blockNo
    const description = result.description
    const town = result.town
    const flatType = result.flatType
    const flatModel = result.flatModel
    const floorLevel = parseInt(result.flatLevel)
    const floorSqm = result.floorSqm
    const leaseCommenceDate = result.leaseCommenceDate
    const resaleDate = result.resaleDate
    const usePrediction = result.usePrediction
    const postalCode = result.postalCode
    // Render property values from database
    res.render('publicResale/editListing', {
      id,
      title,
      resalePrice,
      predictedValue,
      address,
      blockNo,
      town,
      flatType,
      flatModel,
      floorLevel,
      floorSqm,
      leaseCommenceDate,
      resaleDate,
      usePrediction,
      postalCode
    })
  }).catch((err) => console.log('Error in displaying edit HDB Resale Page: ', err))
})

// Update public property information to database
router.put('/edit/:id', checkAgentAuthenticated, checkUUIDFormat, checkResalePublicListingId, (req, res) => {
  // Get UUID from URL
  const resalePublicID = req.params.id

  const filterSpecialRegex = /[-!$%^&*()_+|~=`{}\[\]:";'<>?,.\/]/
  // Inputs
  const address = req.body.address
  const blockNo = req.body.blockNo
  const description = req.body.description
  const postalCode = req.body.postalCode
  // Will add input validation here later
  const town = req.body.town
  const flatType = req.body.flatType
  const flatModel = req.body.flatModel
  const flatLevel = req.body.flatLevel
  const usePrediction = req.body.usePrediction

  // Call floor range selector to select floor range from floor level accordingly
  const floorRange = floorRangeSelector(req.body.flatLevel)
  const floorSqm = req.body.floorSqm

  // Date related inputs
  const leaseCommenceDate = new Date(req.body.leaseCommenceDate)
  const leaseStartYear = leaseCommenceDate.getFullYear()
  const dateOfSale = new Date(req.body.dateOfSale)

  // Input Validation
  // if (filterSpecialRegex.test(address) === false) {
  //   return console.log('Address contains special characters')
  // }
  // if (filterSpecialRegex.test(description) === false) {
  //   return console.log('Description contains special characters')
  // }
  // if (filterSpecialRegex.test(address) === false) {
  //   return console.log('Address contains special characters')
  // }
  // if (filterSpecialRegex.test(address) === false) {
  //   return console.log('Address contains special characters')
  // }

  // Check if resale date is at least 5 years from lease commence date
  const totalMilisecondsPerDay = 1000 * 60 * 60 * 24
  const yearDiff = ((dateOfSale - leaseCommenceDate) / totalMilisecondsPerDay) / 365
  if (yearDiff < 5) {
    return console.log('Ensure that resale date is at least 5 years from lease date')
  }

  // Call predicting api for public resale housing
  const resaleValue = predictPublicResale(dateOfSale, town, flatType, floorRange, floorSqm, flatModel, leaseStartYear)
  resaleValue.then((response) => {
    const predictedValue = Math.round(response)
    // If user wants to display prediction from AI
    if (Boolean(usePrediction) === true) {
      // Update hdb resale listing according to UUID
      hdbResale.update({
        address,
        blockNo,
        description,
        resalePrice: predictedValue,
        predictedValue,
        town,
        flatType,
        flatModel,
        flatLevel,
        floorSqm,
        leaseCommenceDate,
        resaleDate: dateOfSale,
        postalCode,
        usePrediction
      }, {
        where: { id: resalePublicID }
      }).then(() => {
        // Redirect to confirmation page
        res.redirect('/property/confirmPublicResaleListing/' + resalePublicID)
      }).catch((err) => { console.log('Error in updating HDB Resale Listing: ', err) })
    } else {
      // If we want to display entered resale value instead of predicted value
      const resalePrice = Math.round(req.body.resaleValue)
      // Update hdb resale listing according to UUID
      hdbResale.update({
        address,
        blockNo,
        description,
        resalePrice,
        predictedValue,
        town,
        flatType,
        flatModel,
        flatLevel,
        floorSqm,
        leaseCommenceDate,
        resaleDate: dateOfSale,
        postalCode,
        usePrediction
      }, {
        where: { id: resalePublicID }
      }).then(() => {
        // Redirect to confirmation page
        res.redirect('/property/confirmPublicResaleListing/' + resalePublicID)
      }).catch((err) => { console.log('Error in updating HDB Resale Listing: ', err) })
    }
  })
})

// Confirmation Page for HDB properties
router.get('/confirmPublicResaleListing/:id', checkAgentAuthenticated, checkUUIDFormat, checkResalePublicListingId, (req, res) => {
  const title = 'Confirm HDB Resale Listing'

  // Get UUID from URL
  const resalePublicID = req.params.id

  // Find based on uuid V4
  hdbResale
    .findOne({
      where: {
        id: resalePublicID
      }
    })
    // Will display more information regarding this property later
    .then((hdbResaleDetail) => {
      const id = hdbResaleDetail.id
      const resalePrice = Math.round(hdbResaleDetail.resalePrice)
      const predictedValue = Math.round(hdbResaleDetail.predictedValue)
      const address = hdbResaleDetail.address
      const blockNo = hdbResaleDetail.blockNo
      const town = hdbResaleDetail.town
      const flatType = hdbResaleDetail.flatType
      const floorSqm = hdbResaleDetail.floorSqm
      const description = hdbResaleDetail.description
      const leaseCommenceDate = hdbResaleDetail.leaseCommenceDate
      const isViewable = hdbResaleDetail.isViewable
      const usePrediction = hdbResaleDetail.usePrediction
      const postalCode = hdbResaleDetail.postalCode

      // Calculate percentage differences and
      // round off to 2 decimal places
      const percentagePriceDifference = (((resalePrice - predictedValue) / predictedValue) * 100).toFixed(2)

      res.render('publicResale/previewListing', {
        id,
        address,
        blockNo,
        title,
        resalePrice,
        predictedValue,
        percentagePriceDifference,
        town,
        flatType,
        floorSqm,
        description,
        leaseCommenceDate,
        isViewable,
        usePrediction,
        postalCode
      })
    })
    .catch((err) => {
      console.log('Error: ', err)
    })
})

// Make HDB Resale Listing Public to Customer
router.get('/showListing/:id', checkAgentAuthenticated, checkUUIDFormat, checkResalePublicListingId, (req, res) => {
  // Get UUID from URL
  const resalePublicID = req.params.id

  hdbResale.update({
    // Make this property visible to users from agent
    isViewable: true
  }, {
    where: {
      id: resalePublicID
    }
  })
    .then(() => {
      res.redirect('/property/confirmPublicResaleListing/' + resalePublicID)
    }).catch((err) => { console.log('Error in making HDB Resale Listing Public: ', err) })
})

// Make HDB Resale Listing Private
router.get('/hideListing/:id', checkAgentAuthenticated, checkUUIDFormat, checkResalePublicListingId, (req, res) => {
  // Get UUID from URL
  const resalePublicID = req.params.id

  hdbResale.update({
    // Make this property invisible to users from agent
    isViewable: false
  }, {
    where: {
      id: resalePublicID
    }
  })
    .then(() => {
      res.redirect('/property/confirmPublicResaleListing/' + resalePublicID)
    }).catch((err) => { console.log('Error in making HDB Resale Listing Private: ', err) })
})

// Basic Delete Function
// Delete hdb resale listing
router.get('/delete/:id', checkAgentAuthenticated, checkUUIDFormat, checkResalePublicListingId, (req, res) => {
  // Get UUID from URL
  const resalePublicID = req.params.id

  hdbResale.destroy({
    where: { id: resalePublicID }
  }).then(() => {
    // Redirect to preview resale list page for private properties
    res.redirect('/property/viewPreviewPublicList')
  }).catch((err) => { console.log('Error: ', err) })
})

module.exports = router
