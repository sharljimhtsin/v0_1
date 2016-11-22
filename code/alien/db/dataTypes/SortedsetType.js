/**
 * Created with JetBrains WebStorm.
 * User: liyuluan
 * Date: 14-1-3
 * Time: 下午4:19
 * To change this template use File | Settings | File Templates.
 */


/**
 * 有序集操作类
 */
function Sortedset(client, fullkey, isLog) {
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
Sortedset.prototype.add = function (score, member, callbackFn) {
    this.client.zadd(this.fullkey, score, member, callbackFn);
};

/**
 * 按值从大到小 返回所有项(不含值)
 */
Sortedset.prototype.getAllRev = function (callbackFn) {
    this.client.zrevrange(this.fullkey, 0, -1, callbackFn);
};


/**
 *按值从小到大 返回所有项(不含值)
 */
Sortedset.prototype.getAll = function (callbackFn) {
    this.client.zrange(this.fullkey, 0, -1, callbackFn);
};


/**
 * 按值从大到小 返回所有项 包含值
 */
Sortedset.prototype.getAllRevKV = function (callbackFn) {
    this.client.zrevrange(this.fullkey, 0, -1, "WITHSCORES", callbackFn);
};

Sortedset.prototype.range = function (start, stop, isWITHSCORES, callbackFn) {
    this.client.zrange.apply(this.client, [this.fullkey, arguments[0], arguments[1], arguments[2], arguments[3]]);
};

Sortedset.prototype.revrange = function (start, stop, isWITHSCORES, callbackFn) {
    this.client.zrevrange.apply(this.client, [this.fullkey, arguments[0], arguments[1], arguments[2], arguments[3]]);
};
/**
 * 按值从大到小 返回指定区值项(不含值)
 */
Sortedset.prototype.revrangeRev = function (start, stop, callbackFn) {
    this.client.zrevrange.apply(this.client, [this.fullkey, arguments[0], arguments[1], arguments[2]]);
};
/**
 * 按值从小到大 返回介于 min 和 max 之间(包括等于 min 或 max )的成员(含值)
 */
Sortedset.prototype.rangeByScore = function (min, max, callbackFn) {
    this.client.zrangebyscore.apply(this.client, [this.fullkey, arguments[0], arguments[1], arguments[2]]);
};

Sortedset.prototype.revrank = function (member, callbackFn) {
    this.client.zrevrank(this.fullkey, member, callbackFn);
};

Sortedset.prototype.rank = function (member, callbackFn) {
    this.client.zrank(this.fullkey, member, callbackFn);
};

Sortedset.prototype.score = function (member, callbackFn) {
    this.client.zscore(this.fullkey, member, callbackFn);
};

Sortedset.prototype.incrby = function (increment, member, callbackFn) {
    this.client.zincrby(this.fullkey, increment, member, callbackFn);
};

//删除并返回值为某个区间的对象
Sortedset.prototype.remGetRangeByScore = function (min, max, callbackFn) {
    this.client.multi()
        .zrevrangebyscore(this.fullkey, max, min, "WITHSCORES")
        .zremrangebyscore(this.fullkey, min, max)
        .exec(function (err, res) {
            if (err) {
                callbackFn(err);
            } else if (res == null) {
                callbackFn(null, []);
            } else {
                callbackFn(null, res[0] || [])
            }
        });
};

Sortedset.prototype.rem = function (member, callbackFn) {
    this.client.zrem(this.fullkey, member, callbackFn);
};

Sortedset.prototype.del = function (callbackFn) {
    this.client.del(this.fullkey, callbackFn);
};

//返回总长度
Sortedset.prototype.count = function (min, max, callbackFn) {
    this.client.zcount(this.fullkey, min, max, callbackFn);
};

Sortedset.prototype.expire = function (seconds, callbackFn) {
    this.client.expire(this.fullkey, seconds, callbackFn);
};


module.exports = Sortedset;