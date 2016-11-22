/**
 * 召唤的数据处理
 * User: liyuluan
 * Date: 13-10-24
 * Time: 下午2:05
 */

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");

/**
 * 取免费召唤的信息
 * @param userUid
 * @param callbackFn  => {"1":{"userUid":1,"type":1,"time":121212,"count":1}}
 */
function getFreesummon(userUid,callbackFn) {
//    redis.game(userUid).getObj("freesummon:" + userUid,
    redis.user(userUid).s("freesummon").getObj(function(err,res) {
        if (res == null) {
            var sql = "SELECT * FROM freesummon WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql,function(err,res) {
                if (err) callbackFn(err,null);
                else {
                    if (res == null || res.length == 0) {
                        callbackFn(null,null);
                    } else {
                        var result = {};
                        for (var i = 0; i < res.length; i++) {
                            var resItem = res[i];
                            var resItemType = resItem["type"];
                            result[resItemType] = resItem;
                        }
//                        redis.game(userUid).setObj("freesummon:" + userUid,
                        redis.user(userUid).s("freesummon").setObjex(86400, result,function(err, res) {
                           callbackFn(null,result);
                        });
                    }//if
                }//if
            });
        } else {
            callbackFn(null,res);
        }
    });
}

/**
 * 更新免费召唤的时间和次数
 * @param userUid
 * @param type
 * @param count
 * @param time
 * @param callbackFn
 */
function updateFreesummon(userUid,type,count,time,callbackFn) {
    var whereSql = "userUid=" + mysql.escape(userUid) + " AND type=" + mysql.escape(type);
    mysql.dataIsExist(userUid, "freesummon",whereSql,function(err, res) {
        if (res == 0) {
            var insertSql = 'INSERT INTO freesummon SET ?';
            var insertData = {"userUid":userUid,"type":type,"count":count,"time":time};
            mysql.game(userUid).query(insertSql,insertData,function(err,res) {
                if (err) callbackFn(err,null);
                else {
                    redis.user(userUid).s("freesummon").del();
//                    redis.game(userUid).del("freesummon:" + userUid);
                    callbackFn(null,insertData);
                }
            });
        } else {
            var updateSql = "UPDATE freesummon SET ? WHERE " + whereSql;
            var updateData = {"count":count,"time":time};
            mysql.game(userUid).query(updateSql,updateData,function(err,res) {
                if (err) callbackFn(err,null);
                else {
//                    redis.game(userUid).del("freesummon:" + userUid);
                    redis.user(userUid).s("freesummon").del();
                    updateData["userUid"] = userUid;
                    updateData["type"] = type;
                    callbackFn(null,insertData);
                }
            });
        }
    });
}

/**
 * 取用户召唤的积分和次数数据
 * @param userUid
 * @param callbackFn
 */
function getSummon(userUid,callbackFn) {
//    redis.game(userUid).getObj("summon:" + userUid,
    redis.user(userUid).s("summon").getObj(function(err,res) {
        if (res == null) {
            var sql = "SELECT * FROM summon WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql,function(err,res) {
                if (err) callbackFn(err,null);
                else {
                    if (res == null && res.length == 0) {
                        callbackFn(null,null);
                    } else {
                        var result = res[0];
//                        redis.game(userUid).setObj("summon:" + userUid ,
                        redis.user(userUid).s("summon").setObjex(86400, result, function(err,res) {
                            callbackFn(null,result);
                        });
                    }
                }
            });
        } else {
            callbackFn(null,res);
        }
    });
}

//更新summon数据
function updateSummon(userUid,summonData,callbackFn) {
    var whereSql = "userUid=" + mysql.escape(userUid);
    mysql.dataIsExist(userUid, "summon",whereSql,function(err,res) {
        if (res == 0) {
            var insertSql = 'INSERT INTO summon SET ?';
            var insertData = jutil.copyObject(summonData);
            insertData["userUid"] = userUid;
            mysql.game(userUid).query(insertSql,insertData,function(err,res) {
                if (err) callbackFn(err,null);
                else {
                    redis.user(userUid).s("summon").del()
//                    redis.game(userUid).del("summon:" + userUid);
                    callbackFn(null,insertData);
                }
            });
        } else {
            var updateSql = "UPDATE summon SET ? WHERE " + whereSql;
            mysql.game(userUid).query(updateSql,summonData,function(err,res) {
                if (err) callbackFn(err,null);
                else {
                    redis.user(userUid).s("summon").del();
//                    redis.game(userUid).del("summon:" + userUid);
                    callbackFn(null,summonData);
                }
            });
        }
    });
}



exports.getFreesummon = getFreesummon;
exports.updateFreesummon = updateFreesummon;
exports.getSummon = getSummon;
exports.updateSummon = updateSummon;