'use strict'
/* global sneaky */

sneaky('dev', function () {
  this.description = 'Deploy to dev environment'
  this.user = 'node4'
  this.host = '192.168.0.21'
  this.path = '/teambition/server/node4/bingo-third-pusher'
  this.filter = `
  + config
  + config/default.json
  + lib**
  + locales**
  + secrets**
  + pm2**
  + app.js
  + package.json
  + npm-shrinkwrap.json
  - *
  `
  this.after([
    'yarn --prod',
    'pm2 delete bingo-third-pusher || true',
    'pm2 start pm2/dev.json'
  ].join(' && '))
  this.overwrite = true
  this.nochdir = true
})

sneaky('ga', function () {
  this.description = 'Deploy to pre-ga environment'
  this.user = 'builder'
  this.port = 11122
  this.host = 'builder.teambition.corp'
  this.path = '/teambition/server/bingo-third-pusher-ga'
  this.filter = `
  + config**
  + lib**
  + locales**
  + pm2**
  + app.js
  + package.json
  + yarn.lock
  - *
  `

  this.after([
    'npm i --production',
    'configd git://git@code.teambition.com:server/configs.git:apps/bingo-third-pusher/ga.json config/default.json'
  ].join(' && '))

  this.overwrite = true
  this.nochdir = true
})

sneaky('release', function () {
  this.description = 'Deploy to pre-release environment'
  this.user = 'builder'
  this.port = 11122
  this.host = 'builder.teambition.corp'
  this.path = '/teambition/server/bingo-third-pusher-release'
  this.filter = `
  + config**
  + lib**
  + locales**
  + pm2**
  + app.js
  + package.json
  + yarn.lock
  - *
  `

  this.after([
    'npm i --production',
    'configd git://git@code.teambition.com:server/configs.git:apps/bingo-third-pusher/release.json config/default.json'
  ].join(' && '))

  this.overwrite = true
  this.nochdir = true
})
