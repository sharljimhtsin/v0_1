/**
 * 世界BOSS 战斗数据
 * User: liyuluan
 * Date: 13-12-13
 * Time: 下午1:00
 */

var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var mysql = require("../alien/db/mysql");
var async = require("async");


/**
 * 将一个玩家新的伤害数更新到排行榜
 */
function addUserNewValue(day, userUid, newValue, time, callbackFn) {
    var mDay = day;

    async.parallel([
        function (cb) { //设置玩家战斗时间
            var keyName = "worldBUT:" + day; //worldBoosUserTime
            redis.domain(userUid).h(keyName).set(userUid, time, cb);
        },
        function (cb) { //设置玩家总伤害值
            var keyName = "worldBR:" + mDay; //worldBoosRanking
            redis.dynamic(userUid).z(keyName).incrby(newValue, userUid, cb);
        },
        function (cb) { //设置总伤害
            var mKey = "worldBHurt:" + mDay;
            redis.domain(userUid).s(mKey).incrby(newValue, cb);
        },
        function (cb) { //设置玩家攻击次数
            var mKey = "worldBCount:" + mDay;
            redis.domain(userUid).h(mKey).hincrby(userUid, 1, cb);
        }
    ], function (err, res) {
        if (err) callbackFn(err);
        else {
            callbackFn(null, {"userHurt": res[1], "allHurt": res[2], "attackCount": res[3]});
        }
    });
}

//取boss总伤害
function getAllHurt(userUid, day, callbackFn) {
    var mKey = "worldBHurt:" + day;
    redis.domain(userUid).s(mKey).get(callbackFn);
}


function setLastAttack(day, userUid, userName, hurt, count, heroId, cb) { //最近一次攻击的玩家
    var mKey = "worldBLast:" + day;
    redis.domain(userUid).l(mKey).leftPush(userUid + "|" + userName + "|" + hurt + "|" + count + "|" + heroId, cb);
}

function getLastAttack(userUid, day, cb) {
    var mKey = "worldBLast:" + day;
    redis.domain(userUid).l(mKey).range(0, 4, function (err, res) {
        cb(err, res);
        redis.domain(userUid).l(mKey).trim(0, 4);
    });
}


/**
 * 返回某一天前10名的列表
 * @param day
 * @param callbackFn
 */
function getRanking(userUid, day, callbackFn) {
    var keyName = "worldBR:" + day; //worldBoosRanking
    redis.dynamic(userUid).z(keyName).revrange(0, 9, "WITHSCORES", callbackFn);
}

/**
 * 返回某天某个玩家的排名位置 [排名,值]
 * @param userUid
 * @param day
 * @param callbackFn
 */
function getUserIndex(userUid, day, callbackFn) {
    var keyName = "worldBR:" + day;//worldBoosRanking
    redis.dynamic(userUid).z(keyName).revrank(userUid, function (err, res) {
        if (err) callbackFn(err, null);
        else {
            var rankValue = res;
            redis.dynamic(userUid).z(keyName).score(userUid, function (err, res) {
                if (err) callbackFn(err, null);
                else {
                    var scoreValue = res;
                    callbackFn(null, [rankValue, scoreValue]);
                }
            });
        }
    });
}

/**
 * 设置某天的击杀者
 * @param day
 * @param userUid
 * @param callbackFn
 */
function setDayKiller(day, userUid, callbackFn) {
    var keyName = "worldBK:" + day; //worldBoosKiller
    redis.domain(userUid).s(keyName).set(userUid, callbackFn);
}

/**
 * 取某天的击杀者
 * @param day
 * @param callbackFn
 */
function getDayKiller(userUid, day, callbackFn) {
    var keyName = "worldBK:" + day; //worldBoosKiller
    redis.domain(userUid).s(keyName).get(callbackFn);
}


/**
 * 设置某天boss的状态 0未开始 1进行中 2已挂
 * 设置完会返回上一状态
 * @param day
 * @param status
 * @param callbackFn
 */
function setBossStatus(userUid, day, bossStatus, callbackFn) {
    var keyName = "worldBS:" + day; //worldBoosStatus
    redis.domain(userUid).s(keyName).getset(bossStatus, callbackFn);
}

/**
 * 返回某天的boss状态 0未开始 1进行中 2已挂
 * @param day
 * @param callbackFn
 */
function getBossStatus(userUid, day, callbackFn) {
    var keyName = "worldBS:" + day; //worldBoosStatus
    redis.domain(userUid).s(keyName).get(function (err, res) {
        if (err) callbackFn(err);
        else {
            callbackFn(null, res || 0);
        }
    });
}


/**
 * 取服务器BOSS等级
 */
function getBossLevel(userUid, callbackFn) {
    redis.domain(userUid).s("wBossLevel").get(function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            if (res == null) {
                var sql = "SELECT * FROM serverData WHERE name='bossLevel'";
                mysql.game(userUid).query(sql, function (err, res) {
                    if (err) callbackFn(err);
                    else {
                        if (res == null || res.length == 0) {
                            callbackFn(null, null);
                        } else {
                            var mBossLevel = res[0]["value"];
                            redis.domain(userUid).s("wBossLevel").set(mBossLevel, function (err, res) {
                                //设置完成
                            });
                            callbackFn(null, mBossLevel);
                        }
                    }
                });
            } else {
                callbackFn(null, res - 0);
            }
        }
    });


}

/**
 * 设置服务器BOSS等级
 * @param bossLevel
 * @param callbackFn
 */
function setBossLevel(userUid, bossLevel, callbackFn) {
    var sql = "UPDATE serverData SET value=" + mysql.escape(bossLevel) + " WHERE name='bossLevel'";
    mysql.game(userUid).query(sql, function (err, res) {
        if (err || (res != null && res["affectedRows"] === 0)) {
            var insertSql = "INSERT INTO serverData SET ?";
            mysql.game(userUid).query(insertSql, {"name": "bossLevel", "value": bossLevel}, function (err, res) {
                if (err) callbackFn(err);
                else {
                    redis.domain(userUid).s("wBossLevel").set(bossLevel, function (err, res) {
                        //设置完成
                    });
                    callbackFn(null, 1);
                }
            });
        } else {
            redis.domain(userUid).s("wBossLevel").set(bossLevel, function (err, res) {
                //设置完成
            });
            callbackFn(null, 1);
        }
    });
}

/**
 * 取每天玩家最后一次战斗时
 * @param day
 * @param userUid
 * @param callbackFn
 */
function getUserTime(day, userUid, callbackFn) {
    var keyName = "worldBUT:" + day; //worldBoosUserTime
    redis.domain(userUid).h(keyName).get(userUid, function (err, res) {
        if (err) callbackFn(err);
        else {
            if (res == null) callbackFn(null, 0);
            else callbackFn(null, res);
        }
    });
}

/**
 * 设置浴血奋战次数
 * @param day
 * @param userUid
 * @param callbackFn
 */
function setBloody(day, userUid, callbackFn) {
    var keyName = "worldBBloody:" + day;
    redis.domain(userUid).h(keyName).hincrby(userUid, 1, callbackFn);
}

//取浴血奋战次数
function getBloody(day, userUid, callbackFn) {
    var keyName = "worldBBloody:" + day;
    redis.domain(userUid).h(keyName).get(userUid, function (err, res) {
        if (err) callbackFn(err);
        else {
            if (res == null) callbackFn(null, 0);
            else {
                callbackFn(null, res);
            }
        }
    });
}

//取玩家的总攻击次数
function getAttackCount(day, userUid, callbackFn) {
    var mKey = "worldBCount:" + day;
    redis.domain(userUid).h(mKey).get(userUid, callbackFn);
}


//设置userUid对应的用户名及等级
function setUserNameAndLevel(day, userUid, name, level, callbackFn) {
    var mKey = "worldB_NL:" + day;
    redis.domain(userUid).h(mKey).set(userUid, name + "|" + level, callbackFn);
}

//取userUid对应的用户名及等级
function getUserNameAndLevel(day, userUid, callbackFn) {
    var mKey = "worldB_NL:" + day;
    redis.domain(userUid).h(mKey).get(userUid, callbackFn);
}

//设排行榜列表
function setRankStr(userUid, day, str, callbackFn) {
    var mKey = "worldB_Str:" + day;
    redis.domain(userUid).s(mKey).set(str, callbackFn);
}

//取排行榜列表
function getRankStr(userUid, day, callbackFn) {
    var mKey = "worldB_Str:" + day;
    redis.domain(userUid).s(mKey).get(callbackFn);
}

//设置实时信息
function setRealTimeInfoString(userUid, day, str, callbackFn) {
    var mKey = "worldB_RT:" + day;
    redis.domain(userUid).s(mKey).setex(10, str, callbackFn);
}

//获取实时信息
function getRealTimeInfoString(userUid, day, callbackFn) {
    var mKey = "worldB_RT:" + day;
    redis.domain(userUid).s(mKey).get(callbackFn);
}


//设置某天的数据过期时间
function setExpire(userUid, day) {
    var mTime = 60 * 60 * 24 * 5; //缓存五天
    var redisClient = redis.domain(userUid);
    redisClient.s("worldB_Str:" + day).expire(mTime);
    redisClient.s("worldB_NL:" + day).expire(mTime);
    redisClient.s("worldBCount:" + day).expire(mTime);
    redisClient.s("worldBBloody:" + day).expire(mTime);
    redisClient.s("worldBUT:" + day).expire(mTime);
    redisClient.s("worldBS:" + day).expire(mTime);
    redisClient.s("worldBK:" + day).expire(mTime);
    redisClient.s("worldBR:" + day).expire(mTime);
    redisClient.s("worldBHurt:" + day).expire(mTime);
    redisClient.s("worldBLast:" + day).expire(mTime);
}


exports.addUserNewValue = addUserNewValue; //添加用新伤害值
exports.getRanking = getRanking; //取排行榜
exports.getUserIndex = getUserIndex; //取某用户排行
exports.setDayKiller = setDayKiller; //设置击杀者
exports.getDayKiller = getDayKiller; //取击杀者
exports.getAllHurt = getAllHurt;// 取总伤害值
exports.getBossLevel = getBossLevel; //boss等级
exports.setBossLevel = setBossLevel; //boss等级
exports.setBossStatus = setBossStatus; //BOSS状态
exports.getBossStatus = getBossStatus; //BOSS状态
exports.setLastAttack = setLastAttack;//设置最近一次攻击的玩家
exports.getLastAttack = getLastAttack;//
exports.getUserTime = getUserTime; //取最后一次战斗时间
exports.setBloody = setBloody;
exports.getBloody = getBloody;//取浴血奋战次数
exports.getAttackCount = getAttackCount;//取攻击次数
exports.setUserNameAndLevel = setUserNameAndLevel;
exports.getUserNameAndLevel = getUserNameAndLevel;
exports.setRankStr = setRankStr;
exports.getRankStr = getRankStr;
exports.getRealTimeInfoString = getRealTimeInfoString; //设置实时数据
exports.setRealTimeInfoString = setRealTimeInfoString;
exports.setExpire = setExpire;