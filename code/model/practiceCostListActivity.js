/**
 * 累积消费
 * User: one
 * Date: 14-06-27
 * Time: 上午12:25
 * To change this template use File | Settings | File Templates.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var bitUtil = require("../alien/db/bitUtil");
var activityData = require("../model/activityData");
var activityConfig = require("../model/activityConfig");

//取得活动数据库的配置
function _getCostList(userUid,stTime,endTime,num, callbackFn) {
    var _num = num || 10;
    var sql = "SELECT userUid,data AS consume FROM activityData WHERE"
        + " type=" + activityData.COSTLIST_ACTIVITY
        + " AND dataTime >= " + stTime
        + " And dataTime <= " + endTime
        + " ORDER BY data DESC,dataTime"
        + " LIMIT " + _num;
    mysql.game(userUid).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else {
            callbackFn(null, res);
        }
    });
}
function _getSelfData(userUid,stTime,endTime,num, callbackFn) {
    activityData.getActivityData(userUid,activityData.COSTLIST_ACTIVITY,function(err,res) {
        if(err) {
            callbackFn(err);
        } else {
            callbackFn(null, res);
        }
    });
}

function _getSelfRank(userUid, stTime,endTime, callback) {
    _getCostList(userUid, stTime, endTime, 10, function(err, res) {
        if (err) {
            callback(err);
        } else {
            if (res == null) {
                callback(null, [999999, 0]);
            } else {
                for (var i = 0; i < res.length; i++) {
                    if (res[i]["userUid"] == userUid) {
                        callback(null, [i+1, res[i]["consume"]]);
                        return;
                    }
                }
                callback(null, [999999, 0]);
            }
        }

    });
}

/**
 * 添加充值记录
 * @param userUid
 * @param pay
 * @param callbackFn
 */
function addRecord(userUid, pay, callbackFn) {
    var ACTIVITY_CONFIG_NAME = "costListActivity";
    var countPay;
    var startTime,endTime;
    async.series([
        // 获取活动配置数据
        function(cb) {
            activityConfig.getConfig(userUid, ACTIVITY_CONFIG_NAME, function(err, res){
                if (err || res == null) cb("CannotGetConfig");
                else {
                    if (res[0]) {
                        startTime = res[4];
                        endTime = res[5];
                        cb(null);
                    } else {
                        cb("notOpen");
                    }
                }
            });
        },
        function(cb) {
            activityData.getActivityData(userUid,activityData.COSTLIST_ACTIVITY,function(err,res) {
                if(err) {
                    cb(err);
                } else {
                    if(res) {
                        if(res["dataTime"]*1 >= startTime && res["dataTime"]*1 <= endTime) {
                            countPay = res["data"]*1 + pay;
                        } else {
                            countPay = pay;
                        }
                    } else {
                        countPay = pay;
                    }
                    cb(null);
                }
            });
        },
        // 添加消费记录
        function(cb) {
            activityData.updateActivityData(userUid,
                activityData.COSTLIST_ACTIVITY,
                {
                    "dataTime" : jutil.now(),
                    "data" : countPay
                },
                function(err, res){
                    if (err) {
                        cb(err);
                    } else {
                        cb(null);
                    }
                }
            );
        }
    ], function(err){
        callbackFn();
    });
};




exports.getCostList = _getCostList;
exports.getSelfData = _getSelfData;
exports.getSelfRank = _getSelfRank;
exports.addRecord = addRecord;