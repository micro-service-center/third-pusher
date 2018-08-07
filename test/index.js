'use strict'
const app = require('../lib/app')
const tman = require('tman')

tman.before(function * () {
  yield app.isReady
})
