/**
 * 用户的变量记录
 * User: liyuluan
 * Date: 13-11-5
 * Time: 上午11:21
 */

var redis = require("../alien/db/redis");
var mysql = require("../alien/db/mysql");

/**
 * 今日PVE战斗次数加1
 * @param userUid
 * @param [callbackFn]
 */
function incrPveCount(userUid, callbackFn) {
    var mDay = getDay();
    var keyName = "pveCount:" + mDay;
    redis.user(userUid).s(keyName).incr(callbackFn);
    redis.user(userUid).s(keyName).expire(604800);
}

/**
 * 取今日PVE战斗次数
 * @param userUid
 * @param callbackFn
 */
function getPveCount(userUid, callbackFn) {
    var mDay = getDay();
    var keyName = "pveCount:" + mDay;
    redis.user(userUid).s(keyName).get(callbackFn);
}

function getDay() {
    return Math.floor(Date.now() / 86400000);
}

/**
 * 设置变量数据
 * @param userUid
 * @param name
 * @param value
 * @param callbackFn
 */
function setVariable(userUid, name, value, callbackFn) {
    setVariableTime(userUid, name, value, 0, callbackFn);
}

/**
 * 设置变量数据，包括时间值（通常为操作时间)
 * @param userUid
 * @param name
 * @param value
 * @param time
 * @param callbackFn
 */
function setVariableTime(userUid, name, value, time, callbackFn) {
    var whereSql = "userUid=" + mysql.escape(userUid) + " AND name=" + mysql.escape(name);
    mysql.dataIsExist(userUid, "variable", whereSql, function (err, res) {
        if (err) callbackFn(err, null);
        if (res == 1) {
            var updateSql = "UPDATE variable SET ? WHERE " + whereSql;
            var updateData = {"name": name, "value": value, "time": time};
            mysql.game(userUid).query(updateSql, updateData, function (err, res) {
                if (err) callbackFn(err, null);
                else {
                    var redisValue = value;
                    if (time != 0) redisValue = redisValue + "|" + time;
                    redis.user(userUid).h("variable").set(name, redisValue, function (err, res) {
                        redis.user(userUid).h("variable").expire(604800);
                        callbackFn(null, 1);
                    });
                }
            });
        } else {
            var insertSql = "INSERT INTO variable SET ?";
            var insertData = {"userUid": userUid, "name": name, "value": value, "time": time};
            mysql.game(userUid).query(insertSql, insertData, function (err, res) {
                if (err) callbackFn(err, null);
                else {
                    var redisValue = value;
                    if (time != 0) redisValue = redisValue + "|" + time;
                    redis.user(userUid).h("variable").set(name, redisValue, function (err, res) {
                        redis.user(userUid).h("variable").expire(604800);
                        callbackFn(null, 1);
                    });
                }
            });

        }
    });
}

/**
 * 取一个变量的值，res 为最终值
 * @param userUid
 * @param name
 * @param callbackFn
 */
function getVariable(userUid, name, callbackFn) {
    redis.user(userUid).h("variable").get(name, function (err, res) {
        if (err) callbackFn(err, null);
        else if (res == null) {
            var sql = "SELECT * FROM variable WHERE userUid=" + mysql.escape(userUid) + " AND name=" + mysql.escape(name);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err) callbackFn(err);
                else if (res == null || res.length == 0) {
                    callbackFn(null, null);
                } else {
                    var mRes = res[0];
                    callbackFn(null, mRes["value"]);
                }
            });
        } else {
            var v = res.split("|")[0];
            callbackFn(null, v);
        }
    });
}

/**
 * 取变量的值，res {"value":value,"time":time}
 * @param userUid
 * @param name
 * @param callbackFn
 */
function getVariableTime(userUid, name, callbackFn) {
    redis.user(userUid).h("variable").get(name, function (err, res) {
        if (err) callbackFn(err, null);
        else if (res == null) {
            var sql = "SELECT * FROM variable WHERE userUid=" + mysql.escape(userUid) + " AND name=" + mysql.escape(name);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err) {
                    callbackFn(err, null);
                } else if (res == null || res.length == 0) {
                    callbackFn(null, null);
                } else {
                    var mRes = res[0];
                    var returnRes = {"value": mRes["value"], "time": mRes["time"]};
                    redis.user(userUid).h("variable").set(name, mRes["value"] + "|" + mRes["time"]);
                    callbackFn(null, returnRes);
                }
            });
        } else {
            var mArr = res.split("|");
            if (mArr.length <= 1) mArr[1] = 0;
            callbackFn(null, {"value": mArr[0], "time": mArr[1]});
        }
    });
}

function delVariable(userUid, name, callbackFn) {
    redis.user(userUid).h("variable").hdel(name, function (err, res) {
        var sql = "DELETE FROM variable WHERE userUid=" + mysql.escape(userUid) + " AND name=" + mysql.escape(name);
        mysql.game(userUid).query(sql, function (err, res) {
            callbackFn(err, res);
        });
    });
}

function setLanguage(userUid, language, callbackFn) {
    redis.user(userUid).s("language").setex(604800, language, callbackFn);
}

function getLanguage(userUid, callbackFn) {
    redis.user(userUid).s("language").get(callbackFn);
}

function setPlatformId(userUid, platformId, callbackFn) {
    redis.user(userUid).s("platformId").setex(604800, platformId, callbackFn);
}

function getPlatformId(userUid, callbackFn) {
    redis.user(userUid).s("platformId").get(callbackFn);
}


exports.incrPveCount = incrPveCount;
exports.getPveCount = getPveCount;
exports.setVariable = setVariable;
exports.setVariableTime = setVariableTime;
exports.getVariable = getVariable;
exports.getVariableTime = getVariableTime;
exports.delVariable = delVariable;
exports.setLanguage = setLanguage;
exports.getLanguage = getLanguage;
exports.setPlatformId = setPlatformId;
exports.getPlatformId = getPlatformId;
