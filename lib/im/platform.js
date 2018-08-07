'use strict'

const util = require('../util')
const ilog = require('ilog')
const urllib = require('urllib')
const db = require('limbo').use('teambition')
const handleEventList = [
  'discuss.room.deal'
]

class Platform {
  constructor (opts) {
    if (!opts || !opts.refer) throw new Error('refer is required')
    this.refer = opts.refer
    this.opts = opts
  }

  /**
   *  1. 判断是否需要处理该hook
   *  2. 生成跳回的链接
   *  3. tbid转换为对应的平台id
   *  4. 发送消息
  **/
  * handle (hookData) {
    hookData = this.appendEntityType(hookData)
    let orgMap = yield this.needHandle(hookData.event, hookData.data._workspaceId, hookData.data.entityType)
    if (!orgMap) return false
    hookData.data.link = this.buildLink(hookData.data.resourceType, hookData.data._resourceId, orgMap)
    let handler = null
    let allHandled = true
    ilog.info({
      class: 'msg-queue',
      data: hookData
    })

    // openids 获取 weixin-user 历史的 openids 数据
    let openIds = yield this.tbId2openId(hookData.data.members, orgMap)
    handler = this.pushLinkMsg
    let handled = yield handler.call(this, hookData.data, openIds, orgMap)
    return allHandled && handled
  }

  appendEntityType (hookData) {
    hookData.data.entityType = 'weixin'
    return hookData
  }

  * needHandle (eventName, _organizationId) {
    // 测试环境返回固定的orgMap，方便测试
    if (process.env.NODE_ENV === 'test') return {extra: {agentId: 'test'}, refId: '41423'}
    // 是否需要处理的事件类型
    if (handleEventList.indexOf(eventName) === -1) return false
    if (!_organizationId) return false
    // 是否存在绑定关系
    let idmap = yield db.idmap.findOneAsync({
      refer: `${this.refer}-org`,
      _tbId: _organizationId
    })
    if (!idmap) return false
    return idmap
  }

  // 生成消息链接
  buildLink (entityType, _entityId) {
    return `${this.opts.appHost}/${entityType}/${_entityId}`
  }

  // tbid转换平台id
  * tbId2openId (tbIds) {
    if (process.env.NODE_ENV === 'test') return tbIds
    let reciverUsers = yield db.idmap.findAsync({
      refer: `${this.refer}-user`,
      _tbId: {$in: tbIds}
    })
    return reciverUsers.map((userMap) => userMap.refId)
  }

  * pushDefaultMsg (formatedData, title, openIds, orgMap) {
    if (!this.opts.pushApi) throw new Error('pushApi is required')
    let params = {
      entityType: formatedData.entityType,
      entityData: formatedData.entityData,
      title: title,
      openIds: openIds,
      link: formatedData.link,
      content: formatedData.content,
      createTime: formatedData.createTime
    }
    params.sign = util.signature(params)
    let res = yield urllib.request(this.opts.pushApi, {
      contentType: 'json',
      data: params,
      method: 'POST',
      dataType: 'json'
    })
    return res.status === 200
  }
}

module.exports = Platform
module.exports.handleEventList = handleEventList
