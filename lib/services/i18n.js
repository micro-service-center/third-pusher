'use strict'

const i18n = require('i18n')
const config = require('config')
const path = require('path')

i18n.configure({
  directory: path.resolve(__dirname, '../../locales'),
  defaultLocale: config.langs[0],
  locales: config.langs,
  cookie: 'lang',
  updateFiles: false
})

const __ = i18n.__
const entityMap = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '\'',
  '&#39;': '\'',
  '&#x2F;': '/'
}

let exp = new RegExp(Object.keys(entityMap).join('|'))

const unescape = function (str) {
  if (!str) return str
  return str.replace(exp, (match) => entityMap[match] || match)
}

i18n.__ = function () {
  return unescape(__.apply(this, arguments))
}

exports.getTranslator = function (language) {
  return function () {
    return i18n.__.apply({
      locale: language
    }, arguments)
  }
}
