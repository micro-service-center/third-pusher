'use strict'

const ilog = require('ilog')
const config = require('config')
const Platform = require('./platform')

const _ = require('lodash')
let platformIns = {}

_.keys(config.platforms).forEach(key => {
  let pf = config.platforms[key]
  try {
    let Mod = require(`./${key}`)
    platformIns[pf.refer] = new Mod(pf)
  } catch (e) {
    platformIns[pf.refer] = new Platform(pf)
  }
})

exports.get = function * (refer) {
  return platformIns[refer] || null
}

// 获取支持的第三方平台refer的数组
exports.supported = function () {
  let rt = []
  for (let k in platformIns) {
    rt.push(platformIns[k].refer)
  }
  return rt
}

exports.handle = function * (hookData) {
  let handled = {}

  for (let key in platformIns) {
    let pf = platformIns[key]
    try {
      handled[key] = yield pf.handle(hookData)
    } catch (e) {
      handled[key] = false
      if (!e.class) e.class = `${key}-handle-error`
      ilog.error(e)
    }
  }
  return handled
}
