'use strict'

const toa = require('toa')
const ilog = require('ilog')
const config = require('config')
const toaBody = require('toa-body')
const thunk = require('thunks')()
const pkg = require('../package.json')

ilog.level = config.log_level || 6

const app = module.exports = toa()
config.env = app.config.env
app.onerror = (err) => { ilog.error(err) }

toaBody(app)

app.isReady = new Promise((resolve, reject) => {
  thunk(function * () {
    yield [
      require('./services/limbo').isReady,
      require('./services/redis').isReady
    ]
    const router = require('./router')
    app.use(router.toThunk())
    app.listen(config.port, () => ilog.info({class: pkg.name, listen: config.port}))
    resolve()
  })()
})

module.exports = app
