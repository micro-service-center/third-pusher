'use strict'

const config = require('config')
config.port += 10000
require('./app')

const ilog = require('ilog')
const thunk = require('thunks')()
const urllib = require('urllib')
const mongo = require('./lib/service/limbo')
const redis = require('./lib/service/redis')

thunk.race([
  function * () {
    yield thunk.delay(3000)
    throw new Error('Self test timeout!')
  },
  function * () {
    let time = Date.now()
    // should not shrow error.
    ilog.info('Check Mongodb...')
    ilog('Mongodb result', yield mongo.testSelf())

    ilog.info('Check Redis...')
    ilog('Redis result:', yield redis.testSelf())

    ilog.info('Check App Server...')
    let res = yield urllib.request(`http://localhost:${config.port}`)
    if (res.status !== 200) throw new Error(`App failure: ${res.status}`)
    ilog('App result:', res.res)

    ilog.info(`Self test success, ${Date.now() - time} ms!`)
  }
])((err) => {
  if (err) ilog(err)
  process.exit(err ? 1 : 0)
})
