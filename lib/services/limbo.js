'use strict'

const fs = require('fs')
const path = require('path')
const ilog = require('ilog')
const limbo = require('limbo')
const config = require('config')
const db = module.exports = limbo.use('teambition', {provider: 'rpc'})

db.on('error', (error) => {
  error.class = 'limbo-error'
  ilog.error(error)
  throw error
})
db.isReady = new Promise(function (resolve, reject) {
  db.once('connect', () => {
    ilog.info({ 'class': 'self-test', mongodb: 'db connected' })
    resolve()
  })
})
db.connect({
  url: config.limbo.url,
  tls: {
    cert: fs.readFileSync(path.resolve(__dirname, config.limbo.cert)),
    key: fs.readFileSync(path.resolve(__dirname, config.limbo.key)),
    rejectUnauthorized: false
  }
}, function () {
  let count = 0
  setInterval(() => {
    let timer = setTimeout(() => {
      throw new Error('limbo heartbeat ' + count + ' timeout')
    }, 5000)
    count++
    ilog.debug('send heartbeat', count)
    db.methods((err) => {
      clearTimeout(timer)
      if (err) throw err
    })
  }, 60000)
})

db.testSelf = function * () {
  yield db.isReady
  return yield db.alien.findOneAsync({openId: {$exists: true}})
}
