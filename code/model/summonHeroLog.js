/**
 * 武将的数据处理
 * User: liyuluan
 * Date: 13-10-12
 * Time: 下午2:45
 */

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var async = require("async");


/**
 * 添加Log
 * @param userUid 用户ID
 * @param heroId 要添加的武将
 * @param callbackFn
 */
function addSummonHeroLog(userUid,heroId,callbackFn) {
    var sqlWhere = "userUid = " + mysql.escape(userUid) + " AND heroId = " +  mysql.escape(heroId);
    mysql.dataIsExist(userUid,"summonHeroLog",sqlWhere,function(err,res) {
        if (err) {
            callbackFn(err,null);
        } else {
            if (res == 1) callbackFn(null, null);
            else {
                var sql = "INSERT INTO summonHeroLog SET ? ";
                var newData = {};
                newData["userUid"] = userUid;
                newData["heroId"] = heroId;
                mysql.game(userUid).query(sql, newData, function (err, res) {
                    if (err) {
                        callbackFn(err, null);
                    } else {
                        callbackFn(null, newData);
                    }
                    redis.user(userUid).s("summonHeroLog").del();
                });
            }
        }
    });
}

// 取Log列表
function getSummonHeroLog(userUid,callbackFn) {
    redis.user(userUid).s("summonHeroLog").getObj(function(err,res) {
        if (res == null) {
            var sql = "SELECT * FROM summonHeroLog WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql,function(err,res) {
                if (err || res == null) {
                    callbackFn(err,null);
                } else {
                    var logObj = {};
                    for (var i = 0; i < res.length; i++) {
                        var mItem = res[i];
                        logObj[mItem["heroId"]] = mItem;
                    }

                    redis.user(userUid).s("summonHeroLog").setObjex(86400, logObj,function(err,res) {
                        callbackFn(null,logObj);
                    });
                }
            });
        } else {
            callbackFn(null,res);
        }
    });
}


exports.addSummonHeroLog = addSummonHeroLog;
exports.getSummonHeroLog = getSummonHeroLog;