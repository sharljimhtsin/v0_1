/**
 *
 * User: liyuluan
 * Date: 14-1-16
 * Time: 下午3:56
 */
var redis = require("./redis");
var mysql = require("./mysql");


function DBJoint() {
    this._sql = ""; //查询的sql语句
    this._redis = "user"; //redis是以user方式存储的还是domain
    this._key = ""; //用于存储redis的key,如果key中带:则会加上userUid
    this._mysqlKey = ""; //将mysql的某个字段做为索引
    this._expire = 0;//过期时间，0为不设过期
}

DBJoint.prototype.sql = function(value) {
    this._sql = value;
    return this;
}

DBJoint.prototype.redis = function(value) {
    this._redis = value;
    return this;
}

DBJoint.prototype.key = function(value) {
    this._key = value;
    return this;
}

DBJoint.prototype.mysqlKey = function(value) {
    this._mysqlKey = value;
    return this;
}

DBJoint.prototype.expire = function(value) {
    this._expire = value;
    return this;
}



DBJoint.prototype.toCache = function(userUid, callbackFn) {
    var redisDB;
    if (this._redis == "user") redisDB = redis.user(userUid);
    else redisDB = redis.domain(userUid);

    var mKey = this._key.replace(":", ":" + userUid);
    var mThis = this;
    var redisDB_hash = redisDB.h(mKey);
    redisDB_hash.exists(function(err, res) {
        if (err) callbackFn(err);
        else {
            if (res == 0) {
                var mSql = mThis._sql.replace("{userUid}", userUid);
                mysql.game(userUid).query(mSql, function(err, res) {
                    if (err || res == null || res.length == 0) callbackFn(err, 0);
                    else {
                        redisDB_hash.setAllJSONFromArray(res, mThis._mysqlKey, function(err, res) {
                            if (err) callbackFn(err);
                            else {
                                callbackFn(null, 1);
                            }
                        });
                        if (mThis._expire > 0 ) redisDB_hash.expire(mThis._expire);
                    }
                });
            } else {
                callbackFn(null, 1);
            }
        }
    });
}


module.exports = DBJoint;