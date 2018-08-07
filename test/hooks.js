'use strict'

const hooks = {
  'discuss.room.deal': {'event': 'discuss.room.deal', 'data': {'members': ['5ad4812cb0caee0001495068', '5ad4812cb0caee0001495068'], 'resourceType': 'deal', '_resourceId': '5b5a8a30bfdeec7a7b7d93a7', 'title': '任重道 : 111', 'resourceName': 'dealname'}}
}

exports.get = function (key) {
  return key ? hooks[key] : hooks
}
