'use strict'

const ilog = require('ilog')
const urllib = require('urllib')
const Platform = require('./platform')
const redis = require('../services/redis')
const db = require('limbo').use('teambition')
const config = require('config')
const moment = require('moment')
const source = 'mp'

class QyWechatMP extends Platform {
  // 生成通知链接
  buildLink (resourceType, _resourceId, orgMap) {
    let redirectUrl = `${this.opts.appHost}/corpId/${orgMap.refId}/${resourceType}/${_resourceId}/detail`
    return `pages/index/index?redirectUrl=${redirectUrl}`
  }

  // 判断事件类型是否需要处理，需要处理返回企业微信具体信息
  * needHandle (eventName, _organizationId, appType) {
    // 测试环境返回固定的orgMap，方便测试
    if (process.env.NODE_ENV === 'test') return {extra: {agents: [{agentid: 'test'}]}, refId: '41423'}
    // 是否需要处理的事件类型
    if (this.opts.hooksNeedHandle.indexOf(eventName) === -1) return false
    if (!_organizationId) return false
    // 是否存在绑定关系
    let idmap = yield db.idmap.findOneAsync({
      refer: appType === 'bingo' ? `${this.refer}-corp-bingo` : `${this.refer}-corp`,
      _tbId: _organizationId
    })
    if (!idmap) return false
    return idmap
  }

  // 根据Teambition UserId获取企业微信UserId
  * tbId2openId (tbIds, orgMap) {
    if (process.env.NODE_ENV === 'test') return tbIds
    // idmap weixin-user 人员关联 _tbId
    let reciverUsers = yield db.idmap.findAsync({
      refer: `${this.refer}-user`,
      _tbId: {$in: tbIds},
      refId: orgMap.refId
    })
    return reciverUsers.map((userMap) => userMap.extra.userid)
  }

  // 推送企业微信通知
  * pushLinkMsg (message, openids, orgMap) {
    ilog.info({
      class: 'qywechatmp-push-linkmsg',
      message: message,
      title: message.title,
      openids: openids
    })
    let corpInfo = orgMap.extra

    // 获取需要推送的部门
    let agentid = getAgentid(corpInfo.agents)
    if (!agentid) return null

    let accessToken = yield this.getCorpAccessToken(corpInfo.corpId, corpInfo.permanentCode, message.entityType)

    let body = {
      touser: openids.join('|'),
      msgtype: 'miniprogram_notice',
      miniprogram_notice: {
        appid: config.platforms.qy_wechat_mp.appid,
        page: message.link,
        title: this.titleFormat(message),
        description: this.dateFormat(message.createdTime),
        content_item: [
          {
            key: this.contentFormat(message),
            value: message.title
          },
          {
            key: message.objectName,
            value: `${message.objectName}: ${message.resourceName}`
          }
        ]
      }
    }

    ilog.info({
      class: 'push-body',
      data: body
    })
    let res = yield urllib.request(`${this.opts.pushApi}?access_token=${accessToken}`, {
      method: 'POST',
      data: body,
      contentType: 'json',
      dataType: 'json'
    })
    if (res.data.errcode) {
      ilog.info({
        class: 'qywechatmp-push-error',
        status: res.status,
        data: res.data,
        body: body
      })
    }
    return res.status === 200
  }

  appendEntityType (hookData) {
    hookData.data.entityType = 'bingo'
    return hookData
  }

  titleFormat (message) {
    if (message.event.includes('discuss')) return `您关注的${message.objectName}有新的评论`
    else return `您关注的${message.objectName}被更新`
  }

  dateFormat (time) {
    let isYear = moment(time).isBetween(moment().startOf('year'), moment().endOf('year'))
    if (isYear) return moment(time).format('M月D日 HH:ss')
    else return moment(time).format('YYYY年M月D日 HH:ss')
  }

  contentFormat (message) {
    if (message.event.includes('discuss')) return '内容'
    else return '操作'
  }

  // corpInfo: {corpId, permanentCode}
  * getCorpAccessToken (corpId, permanentCode, appType) {
    if (process.env.NODE_ENV === 'test') return '85zAxKbRJaZYiGWN2wNeymEd6c1A68Xwhc3519wsrJieW3NvB85rCk9DpuQTGFwIuOSm6hkqbPs7O_kcVLk-vAhcPK0dqLPAUBqcSSOD6MphKU2kXLV-BbwvdqHIJn72jYHEXKcQzqJJDrmsOKRzzuHQQMVpM0R_PqSHtPKI0D2ps4UrjqblAZGOygYkZ9ftCrtHfkD1_8lBK9YuqrQ95w'
    let corpAccessTokenKey = redis.corpAccessTokenKey(corpId, appType, source)
    let accessToken = yield redis.get(corpAccessTokenKey)
    if (!accessToken) {
      let body = {
        suite_id: this.opts.key,
        auth_corpid: corpId,
        permanent_code: permanentCode
      }
      let suiteAccessToken = yield this.getSuiteAccessToken(appType)
      let res = yield urllib.request(`${this.opts.wxHost}/get_corp_token?suite_access_token=${suiteAccessToken}`, {
        data: body,
        method: 'POST',
        dataType: 'json',
        contentType: 'json'
      })
      let accessToken = res.data && res.data.access_token
      if (res.status >= 300 || !accessToken) {
        ilog.info({
          class: 'qywechat-token-error',
          res: res.data,
          status: res.status,
          data: body
        })
        throw new Error('get qyweixin access token failed')
      }
      yield redis.set(corpAccessTokenKey, accessToken, 'EX', res.data.expires_in - 60)
    }
    return accessToken
  }

  * getSuiteAccessToken (appType) {
    let suiteInfo = yield [
      redis.get(redis.suiteTicketKey(appType, source)),
      redis.get(redis.suiteAccessTokenKey(appType, source))
    ]
    if (suiteInfo[1] && suiteInfo[1].startsWith(suiteInfo[0])) {
      return suiteInfo[1].slice(suiteInfo[0].length)
    }

    // 从微信企业号抓取 suiteAccessToken
    let body = {
      suite_id: this.opts.key,
      suite_secret: this.opts.secret,
      suite_ticket: suiteInfo[0]
    }
    let res = yield urllib.request(`${this.opts.wxHost}/get_suite_token`, {
      data: body,
      method: 'POST',
      dataType: 'json',
      contentType: 'json'
    })
    let suiteAccessToken = res.data && res.data.suite_access_token
    if (res.status >= 300 || !suiteAccessToken) {
      ilog.info({
        class: 'qywechatmp-suite-token-error',
        res: res.data,
        status: res.status,
        data: body
      })
      throw new Error('get qyweixin suite token failed')
    }
    yield redis.setex(redis.suiteAccessTokenKey(appType, source), 30 * 60, suiteInfo[0] + suiteAccessToken)
    return suiteAccessToken
  }
}

module.exports = QyWechatMP

function getAgentid (agents, appid) {
  if (!appid) return agents[0] && agents[0].agentid
  for (let agent of agents) {
    if (agent.appid === appid) return agent.agentid
  }
}
