'use strict'

const Router = require('toa-router')
const hookApi = require('./api/hook')
const pkg = require('../package.json')

module.exports = new Router('/btp')
  // bingo third pusher
  .post('/bingo/hook', hookApi.hooksHandler)
  .get('/version', function * () { this.body = { name: pkg.name, version: pkg.version } })
  .otherwise(function () { this.throw(404) })
