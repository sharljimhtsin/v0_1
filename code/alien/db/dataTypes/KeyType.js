/**
 * redis 字符串类别的封装
 * User: liyuluan
 * Date: 14-1-6
 * Time: 下午3:38
 */

function KeyType(client, fullkey, isLog) {
    this.client = client;
    this.fullkey = fullkey;
    this.isLog = isLog;
}


KeyType.prototype.type = function (callbackFn) {
    this.client.type(this.fullkey, callbackFn);
};

KeyType.prototype.keys = function (callbackFn) {
    this.client.keys(this.fullkey, callbackFn);
};

module.exports = KeyType;