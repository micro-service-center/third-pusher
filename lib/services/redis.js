'use strict'

const ilog = require('ilog')
const config = require('config')
const redis = require('thunk-redis')

const client = module.exports = redis.createClient(config.redis_array)

client
  .on('error', function (err) {
    err.class = 'thunk-redis'
    ilog.error(err)
    if (err.code === 'ENETUNREACH') throw err
  })
  .on('close', function (err) {
    err = err || new Error('Redis client closed!')
    err.class = 'thunk-redis'
    ilog.error(err)
    throw err
  })
client.isReady = new Promise(function (resolve, reject) {
  client.once('connect', () => {
    ilog.info({ 'class': 'self-test', redis: 'redis connected' })
    resolve()
  })
})

client.suiteTicketKey = (appType, source) => `WEIXIN${appType === 'bingo' ? ':BINGO' : ''}${source === 'mp' ? ':MP' : ''}:suiteTicket`
client.suiteAccessTokenKey = (appType, source) => `WEIXIN${appType === 'bingo' ? ':BINGO' : ''}${source === 'mp' ? ':MP' : ''}:suiteAccessToken`
client.tbAccessTokenKey = (_userId) => `${config.redis_prefix}:tbAccessToken:${_userId}`
client.corpAccessTokenKey = (corpId, appType, source) => `WEIXIN${appType === 'bingo' ? ':BINGO' : ''}${source === 'mp' ? ':MP' : ''}:corpAccessToken:${corpId}`

client.getCachedWxToken = function * () {
  let token = yield client.get('AC:WX:ACCESSTOKEN')
  return token && JSON.parse(token)
}

client.setCachedWxToken = function * (tokenStr) {
  yield client.setex('AC:WX:ACCESSTOKEN', 60 * 60 * 2 - 10, tokenStr)
}

client.testSelf = function * () {
  return yield client.info('server')
}
