// This file main purpose is to autocreate default users so we don't need to add them manually everytime we restart the server.
const user = require('../models/User')
const uuid = require('uuid')
// const bcrypt = require('bcrypt');

// Admin User Schema
const AdminUserSchema = {
  id: uuid.NIL,
  name: 'Admin',
  email: 'admin@islandgroup.co',
  password: 'password',
  isAgent: false,
  isAdmin: true,
  phoneNo: '12345678'
}

// Agent User Schema
const AgentUserSchema = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Agent',
  email: 'agent@islandgroup.co',
  password: 'password',
  isAgent: true,
  isAdmin: false,
  phoneNo: '12345678'
}

// Agent User Schema
const NormalUserSchema = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'Customer',
  email: 'customer@islandgroup.co',
  password: 'password',
  isAgent: false,
  isAdmin: false,
  phoneNo: '12345678'
}

defaultUserList = [AdminUserSchema, AgentUserSchema]

const DefaultUsersObjects = () => {
  return new Promise((res) => {
    user.findOne({
      where: {
        id: '00000000-0000-0000-0000-000000000000'
      }
    })
      .then((result) => {
        // if user cannot be found
        if (result === null || result === undefined) {
          user.create(AdminUserSchema
          )
          user.create(AgentUserSchema
            )
          console.log('Adding admin user')
          return res(1)
        } else { // if user is found
          console.log('Admin user exists')
          return res(0)
        }
      })
  })
}

// Create default properties
const DefaultPropertiesObjects = () => {
  //
}

// check function
check = async () => {
  const score = await DefaultUsersObjects()

  if (score !== 0) {
    throw Error('Admin User Object is missing in the database.\nWe will be creating admin user right now.')
  }
}

module.exports = { check }
