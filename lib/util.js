'use strict'

const _ = require('lodash')
const config = require('config')
const crypto = require('crypto')
const moment = require('moment')

exports.formatISODate = function (date, language) {
  if (language === 'zh') language = 'zh-cn'
  return moment(date).locale(language).format('ll')
}

const NONCE_CHARS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
exports.getNonce = function (nonceSize) {
  let result = []
  let chars = NONCE_CHARS
  let charPos
  let nonceCharsLength = chars.length

  for (let i = 0; i < nonceSize; i++) {
    charPos = Math.floor(Math.random() * nonceCharsLength)
    result[i] = chars[charPos]
  }
  return result.join('')
}

exports.encodeData = function (toEncode) {
  if (toEncode === null || toEncode === '') {
    return ''
  } else {
    var result = encodeURIComponent(toEncode)
    // Fix the mismatch between OAuth's  RFC3986's and Javascript's beliefs in what is right and wrong ;)
    return result.replace(/!/g, '%21')
                 .replace(/'/g, '%27')
                 .replace(/\(/g, '%28')
                 .replace(/\)/g, '%29')
                 .replace(/\*/g, '%2A')
  }
}

exports.sha1 = function (str) {
  return crypto.createHash('sha1').update(str).digest('hex')
}

/**
 *  流程
 *  1. 获取传入对象的值toString后的数组
 *  2. 第一步获取的数组按ascii码排序
 *  3. 按传入的algo(默认为sha256)生成hmac实例并获取摘要
**/
exports.signature = function (query, algo) {
  let keys = _.map(_.values(query), toString)
  keys.sort()

  let hmac = crypto.createHmac(algo || 'sha256', config.api_sign_key)
  hmac.update(keys.join(''))
  return hmac.digest('hex')

  function toString (obj) {
    if (typeof obj === 'string') return obj
    if (typeof obj === 'number' || Buffer.isBuffer(obj)) return obj.toString()
    return JSON.stringify(obj)
  }
}

// 校验tb webhook签名
exports.checkWebhook = function (query) {
  let sign = query.sign
  let timestamp = query.timestamp
  let nonce = query.nonce
  return webhookSignature(config.client_secret, timestamp, nonce) === sign

  function webhookSignature () {
    let keys = []
    for (let key of arguments) {
      keys.push(key)
    }
    keys.sort()
    let val = keys.join('')
    return crypto.createHash('sha1').update(val).digest('hex')
  }
}
