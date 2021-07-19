const express = require('express')
const router = express.Router()

// Models
const hdbResale = require('../models/hdbResale')
const privateResale = require('../models/PrivateResale')

// Required node modules
const uuid = require('uuid')
const moment = require('moment')
const fetch = require('node-fetch')

const baseAPIUrl = 'http://localhost:8000/api/'
const floorRangeSelector = require('../helpers/floorRangeSelector')
const { checkUUIDFormat, checkResalePublicListingId, checkResalePrivateListingId } = require('../helpers/checkURL')

// Call predict resale API
async function predictPublicResale (dateOfSale, town, flatType, floorRange, floorSqm, flatModel, leaseStartDate) {
  // router.get('/getResalePrediction', (req, res) => {
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
      .then(res => res.json())
      .then((json) => {
        console.log(json)
        result(json)
      })
      .catch((err) => {
        console.log('Error:', err)
      })
  // })
  })
}

// Predict resale value for private housing
async function predictPrivateResale (dateOfSale, floorRange, floorSqm) {
  const body = {
    type: 'private',
    resale_date: dateOfSale,
    storey_range: floorRange,
    floor_area_sqm: floorSqm
  }
  return new Promise((result, err) => {
    fetch(baseAPIUrl + 'predictResale', {
      method: 'post',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => res.json())
      .then((json) => {
        console.log(json)
        result(json)
      })
      .catch((err) => {
        console.log('Error:', err)
      })
  })
}

// Router is placed according to CRUD order where you'll see create function then followed by retrieve and etc

// Reference
router.get('/propertysingle', (req, res) => {
  const title = 'Property Single'
  res.render('resale/property-single', { title: title })
})

router.get('/propertylist', (req, res) => {
  const title = 'List of Properties'
  res.render('resale/property-grid', { title: title })
})

// Show create HDB Resale Page
router.get('/createPublicResaleListing', (req, res) => {
  const title = 'Create HDB Resale Listing'
  res.render('resale/createPublicResale', { title })
})

// Fixed data for testing
router.post('/createPublicResaleListing', (req, res) => {
  const filterSpecialRegex = /[-!$%^&*()_+|~=`{}\[\]:";'<>?,.\/]/
  // Inputs
  const hdbResaleId = uuid.v4()
  const address = req.body.address1
  const description = req.body.description
  // Will add input validation here later
  const town = req.body.town
  const flatType = req.body.flatType
  const flatModel = req.body.flatModel
  const flatLevel = req.body.flatLevel

  // Call floor range selector to select floor range from floor level accordingly
  const floorRange = floorRangeSelector(req.body.flatLevel)
  const floorSqm = req.body.floorSqm

  // Date related inputs
  const leaseStartDate = new Date(req.body.leaseCommenceDate)
  const leaseStartYear = leaseStartDate.getFullYear()
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
  const yearDiff = ((dateOfSale - leaseStartDate) / totalMilisecondsPerDay) / 365
  if (yearDiff < 5) {
    return console.log('Ensure that resale date is at least 5 years from lease date')
  }

  // Call predicting api for public housing
  const resaleValue = predictPublicResale(dateOfSale, town, flatType, floorRange, floorSqm, flatModel, leaseStartYear)
  resaleValue.then((response) => {
    console.log('Resale Value', response)
    console.log(leaseStartDate)
    console.log(dateOfSale)
    console.log('Resale Value', resaleValue)
    const description = 'Sample Description'

    // Create public resale listing
    hdbResale
      .create({
        id: hdbResaleId,
        address: address,
        description: description,
        resalePrice: Math.round(response),
        town: town,
        flatType: flatType,
        flatModel: flatModel,
        flatLevel: flatLevel,
        floorSqm: floorSqm,
        leaseCommenceDate: leaseStartDate,
        resaleDate: dateOfSale,
        isViewable: false
      })
      .then((result) => {
        console.log('Testing')
        // Redirect to confirming property page
        res.redirect('confirmPublicResaleListingPage/' + hdbResaleId)
      })
      .catch((err) => console.log('Error: ' + err))
  })
})

// View individual HDB Resale Page
router.get('/viewPublicResaleListing/:id', checkUUIDFormat, checkResalePublicListingId, (req, res) => {
  const title = 'HDB Resale Listing'
  const secondaryTitle = '304 Blaster Up'

  // Refer to mysql workbench for all property id
  const resalePublicID = req.params.id
  hdbResale
    .findOne({
      where: {
        id: resalePublicID,
        isViewable: true
      }
    })
    // Will display more information regarding this property later
    .then((hdbResaleDetail) => {
      const resalePrice = Math.round(hdbResaleDetail.resalePrice)
      const address = hdbResaleDetail.address
      const town = hdbResaleDetail.town
      const flatType = hdbResaleDetail.flatType
      const floorSqm = hdbResaleDetail.floorSqm
      const description = hdbResaleDetail.description
      const leaseCommenceDate = hdbResaleDetail.leaseCommenceDate
      res.render('resale/viewPublicResaleListing', {
        address,
        title,
        secondaryTitle,
        resalePrice,
        town,
        flatType,
        floorSqm,
        description,
        leaseCommenceDate
      })
    })
    .catch((err) => {
      console.log('Error', err)
    })
})

// HDB Properties that are currently viewable to customers can be found here
router.get('/viewPublicResaleList', (req, res) => {
  const title = 'HDB Resale Listings'
  const isViewable = true
  hdbResale.findAll({
    // Only users can see viewable properties
    where: {
      isViewable: isViewable
    },
    raw: true
  }).then((hdbResale) => {
    res.render('resale/viewPublicResaleList', { title, hdbResale: hdbResale })
  })
})

// Unviewable property listings that customers cannot see
router.get('/viewPreviewPublicList', (req, res) => {
  const title = 'HDB Preview Listings'
  const isViewable = true
  hdbResale.findAll({
    // Only agents can see all properties
    raw: true
  }).then((hdbResale) => {
    res.render('resale/viewPublicResaleList', { title, hdbResale: hdbResale })
  })
})

// Edit Function for public resale listings
router.get('/editPublicResaleListing/:id', checkUUIDFormat, checkResalePublicListingId, (req, res) => {
  const title = 'Edit HDB Resale Listing'

  // Get UUID from URL
  const resalePublicID = req.params.id
  // Find hdb property by id
  hdbResale.findOne({
    where: { id: resalePublicID }
  }).then((result) => {
    // Display result from database
    const id = result.id
    const address = result.address
    const description = result.description
    const town = result.town
    const flatType = result.flatType
    const flatModel = result.flatModel
    const floorLevel = parseInt(result.flatLevel)
    const floorSqm = result.floorSqm
    const leaseCommenceDate = result.leaseCommenceDate
    const resaleDate = result.resaleDate
    // Render property values from database
    res.render('resale/editPublicResale', {
      id,
      title,
      address,
      town,
      flatType,
      flatModel,
      floorLevel,
      floorSqm,
      leaseCommenceDate,
      resaleDate
    })
  }).catch((err) => console.log('Error: ', err))
})

// Update public property information to database
router.put('/editPublicResaleListing/:id', checkUUIDFormat, checkResalePublicListingId, (req, res) => {
  const resalePublicID = req.params.id

  const filterSpecialRegex = /[-!$%^&*()_+|~=`{}\[\]:";'<>?,.\/]/
  // Inputs
  const hdbResaleId = uuid.v4()
  const address = req.body.address1
  const description = req.body.description
  // Will add input validation here later
  const town = req.body.town
  const flatType = req.body.flatType
  const flatModel = req.body.flatModel
  const flatLevel = req.body.flatLevel

  // Call floor range selector to select floor range from floor level accordingly
  const floorRange = floorRangeSelector(req.body.flatLevel)
  const floorSqm = req.body.floorSqm

  // Date related inputs
  const leaseStartDate = new Date(req.body.leaseCommenceDate)
  const leaseStartYear = leaseStartDate.getFullYear()
  const dateOfSale = new Date(req.body.dateOfSale)

  // Input Validation
  if (filterSpecialRegex.test(address) === false) {
    return console.log('Address contains special characters')
  }
  // if (filterSpecialRegex.test(description) === false) {
  //   return console.log('Description contains special characters')
  // }
  if (filterSpecialRegex.test(address) === false) {
    return console.log('Address contains special characters')
  }
  if (filterSpecialRegex.test(address) === false) {
    return console.log('Address contains special characters')
  }

  // Check if resale date is at least 5 years from lease commence date
  const totalMilisecondsPerDay = 1000 * 60 * 60 * 24
  const yearDiff = ((dateOfSale - leaseStartDate) / totalMilisecondsPerDay) / 365
  if (yearDiff < 5) {
    return console.log('Ensure that resale date is at least 5 years from lease date')
  }

  res.send('Hello World')
})

// Confirmation Page for HDB properties
router.get('/confirmPublicResaleListingPage/:id', checkUUIDFormat, checkResalePublicListingId, (req, res) => {
  const title = 'Confirm Resale Listing - Public'

  // Probably need to modify this secondary title
  const secondaryTitle = '304 Blaster Up'

  // Get id from URL
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
      const address = hdbResaleDetail.address
      const town = hdbResaleDetail.town
      const flatType = hdbResaleDetail.flatType
      const floorSqm = hdbResaleDetail.floorSqm
      const description = hdbResaleDetail.description
      const leaseCommenceDate = hdbResaleDetail.leaseCommenceDate
      const isViewable = hdbResaleDetail.isViewable
      res.render('resale/confirmPublicListing', {
        id,
        address,
        title,
        secondaryTitle,
        resalePrice,
        town,
        flatType,
        floorSqm,
        description,
        leaseCommenceDate,
        isViewable
      })
    })
    .catch((err) => {
      console.log('Error: ', err)
    })
})

// Confirmation Page for hdb properties
router.get('/confirmPublicResaleListing/:id', checkUUIDFormat, checkResalePublicListingId, (req, res) => {
  const resalePublicID = req.params.id
  console.log(req.params.id)

  hdbResale.update({
    // Make this property visible to users from agent
    isViewable: true
  }, {
    where: {
      id: resalePublicID
    }
  })
    .then(() => {
      res.send('Public Resale Listing Viewable')
    }).catch((err) => { console.log('Error: ', err) })
})

// Basic Delete Function
// Delete hdb resale listing
router.get('/deletePublicResaleListing/:id', checkUUIDFormat, checkResalePublicListingId, (req, res) => {
  const resalePublicID = req.params.id

  // hdbResale.findOne({
  //   where: { id: hdbResaleId }
  // }).then((result) => {
  // })
  hdbResale.destroy({
    where: { id: resalePublicID }
  }).then((result) => {
    console.log(result)
    res.render('resale/viewPublicResaleList')
  }).catch((err) => { console.log('Error: ', err) })
})

// View individual private Resale Page
// router.get('/viewPrivateResaleListing', (req, res) => {
//   const resalePrivateID = req.params.id
// })

// Display create resale listing page
router.get('/createPrivateResaleListing', (req, res) => {
  const title = 'Create Private Resale Listing'
  res.render('resale/createPrivateResale', { title })
})

// Create listing for private resale property
router.post('/createPrivateResaleListing', (req, res) => {
  // Create UUID
  const privateResaleId = uuid.v4()

  // Inputs
  const address = req.body.address1
  const description = 'Sample Description'
  const postalDistrict = req.body.postalDistrict
  const houseType = req.body.houseType
  const typeOfArea = req.body.typeOfArea
  const marketSegment = req.body.marketSegment
  const floorSqm = req.body.floorSqm
  const floorLevel = req.body.floorLevel

  // Call floor range selector to select floor range from floor level accordingly
  const floorRange = floorRangeSelector(req.body.floorLevel)

  // Date related inputs
  const leaseStartDate = new Date(req.body.leaseCommenceDate)
  const leaseStartYear = leaseStartDate.getFullYear()
  const dateOfSale = new Date(req.body.dateOfSale)

  // Create private resale listing
  privateResale.create({
    id: privateResaleId,
    address: address,
    description: description,
    resalePrice: 2000000,
    houseType: houseType,
    postalDistrict: postalDistrict,
    floorSqm: floorSqm,
    leaseCommenceDate: leaseStartDate,
    resaleDate: dateOfSale,
    isViewable: false
  }).then((result) => {
    res.send('Created private resale listing')
  }).catch((err) => { console.log('Error: ', err) })
})

// Edit Function for private resale listings
router.get('/editPrivateResaleListing/:id', checkUUIDFormat, checkResalePrivateListingId, (req, res) => {
  const title = 'Edit Private Resale Listing'

  // Get UUID from URL
  const privateResaleId = req.params.id
  console.log(privateResaleId)

  privateResale.findOne({
    where: { id: privateResaleId }
  }).then((result) => {
    // Display result from database
    const id = result.id
    const address = result.address
    const description = result.description
    const resalePrice = result.resalePrice
    const houseType = result.houseType
    const postalDistrict = result.postalDistrict
    const floorSqm = result.floorSqm
    const leaseCommenceDate = result.leaseCommenceDate
    const resaleDate = result.resaleDate
    res.render('resale/editPrivateResale', {
      id,
      title,
      address,
      resalePrice,
      houseType,
      postalDistrict,
      floorSqm,
      leaseCommenceDate,
      resaleDate
    })
  }).catch((err) => console.log('Error: ', err))
})

router.put('/editPrivateResaleListings/:id', checkUUIDFormat, checkResalePrivateListingId, (req, res) => {
  // Get UUID from URL
  const resalePrivateID = req.params.id
  res.send('Editing Successful')
})

// Basic Delete Function
// Delete private resale listing
router.get('/deletePrivateResaleListing/:id', checkUUIDFormat, checkResalePrivateListingId, (req, res) => {
  const privateResaleId = req.params.id
  privateResale.destroy({
    where: { id: privateResaleId }
  }).then((result) => {
    console.log(result)
    res.send('Deleted Private Resale Listing')
  }).catch((err) => { console.log('Error: ', err) })
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
    .catch((err) => { console.log('Error: ', err) })
})

module.exports = router
