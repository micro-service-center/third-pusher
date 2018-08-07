'use strict'

const toa = require('toa')
const vfw = require('vfw')
const toaBody = require('toa-body')
const Router = require('toa-router')
require('vfw-tb')(vfw)

vfw.extend('expression', {
  $regMatch: function (target, reg) {
    reg = new RegExp(`^${reg.replace('%s', '.+')}$`)
    return reg.test(target)
  }
})

const app = module.exports = toa()
const router = new Router()
toaBody(app)
app.use(router.toThunk())

router.post('/im/test/cgi-bin/message/send', function * () {
  let data = yield this.parseBody()
  this.body = { status: 200, data }
})

app.listen(9000)
