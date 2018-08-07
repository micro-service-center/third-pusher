'use strict'

const imHdl = require('../im')
const util = require('../util')

exports.hooksHandler = function * () {
  let hookData = yield this.parseBody()
  let isValidEvent = util.checkWebhook(this.query)
  if (!isValidEvent) throw new Error('unvalid event')
  let handled = yield imHdl.handle(hookData)
  this.body = handled
}
