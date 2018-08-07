'use strict'
/* global before */

const tman = require('tman')
const config = require('config')
const assert = require('assert')
const crypto = require('crypto')
const qs = require('querystring')
const supertest = require('supertest')
const hooks = require('./hooks')
const app = require('../lib/app')
const util = require('../lib/util')

tman.suite('api', function () {
  let request = null

  before(function * () {
    request = supertest(app.server)
  })

  let data = hooks.get()

  for (let key in data) {
    let hook = data[key]
    let query = {
      nonce: util.getNonce(6),
      timestamp: Date.now()
    }
    query.sign = webhookSignature(config.client_secret, query.timestamp, query.nonce)
    tman.it(key, function * () {
      let rt = yield request.post(`/btp/bingo/hook?${qs.stringify(query)}`)
        .send(hook)
        .expect(200)
      assert(rt.body && rt.body.weixin)
    })
  }
})

function webhookSignature () {
  let keys = []
  for (let key of arguments) {
    keys.push(key)
  }
  keys.sort()
  let val = keys.join('')
  return crypto.createHash('sha1').update(val).digest('hex')
}
