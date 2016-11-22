/**
 * LIST 链表操作类
 */
function List(client, fullkey, isLog) {
    this.client = client;
    this.fullkey = fullkey;
    this.isLog = isLog;
    if (arguments.length == 4 && arguments[3]) {
        var expireTime = arguments[3];
        this.expire(expireTime, function () {
            // do nothing
        });
    }
}

/**
 * 写入一项的值
 */
List.prototype.len = function (callbackFn) {
    this.client.llen(this.fullkey, callbackFn);
};

/**
 * 截取一个长度
 */
List.prototype.trim = function (start, stop, callbackFn) {
    this.client.ltrim(this.fullkey, start, stop, callbackFn);
};


List.prototype.leftPush = function (value, callbackFn) {
    this.client.lpush(this.fullkey, value, callbackFn);
};

/**
 * 移除并返回列表 key 的头元素
 */
List.prototype.leftPOP = function (callbackFn) {
    this.client.lpop(this.fullkey, callbackFn);
};
/**
 * 将一个或多个值 value 插入到列表 key 的表尾
 */
List.prototype.rightPush = function (value, callbackFn) {
    this.client.rpush(this.fullkey, value, callbackFn);
};

List.prototype.range = function (start, stop, callbackFn) {
    this.client.lrange(this.fullkey, start, stop, callbackFn);
};

/**
 * 删除这个List
 */
List.prototype.del = function (callbackFn) {
    this.client.del(this.fullkey, callbackFn);
};

/**
 * 设置过期时间
 */
List.prototype.expire = function (seconds, callbackFn) {
    this.client.expire(this.fullkey, seconds, callbackFn);
};


module.exports = List;