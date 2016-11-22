/******************************************************************************
 * 赛亚巨献
 * Create by joseppe.
 * Create at 15-4-14.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");

var ACTIVITY_CONFIG_NAME = "messiah";

//获取配置
function getConfig(userUid,callbackFn){
    // 1.获取活动配置数据
    activityConfig.getConfig(userUid,ACTIVITY_CONFIG_NAME,function(err,res){
        if(err || res ==null)callbackFn("CannotgetConfig");
        else{
            if(res[0]){
                var sTime = res[4];
                var eTime = res[5];
                var currentConfig = res[2];
                callbackFn(null, [sTime, eTime, currentConfig]);
            }else{
                callbackFn("notOpen");
            }
        }
    });
}

function addRecord(userUid, pay, callbackFn){
    pay = pay - 0;
    var userData;
    async.series([function(cb) {
        getUserData(userUid, function(err, res){
            if(err){
                cb(err);
            } else {
                userData = res;
                cb(null);
            }
        });
    }, function(cb) {
        userData["data"] += pay;
        activityData.updateActivityData(userUid,activityData.PRACTICE_MESSIAH,{"data":userData["data"], "dataTime":userData["dataTime"], "status":userData["status"], "statusTime":userData["statusTime"]},cb);
    }, function(cb) {
        redis.user(userUid).s("messiah:more").setObj({"reward":userData["reward"], "buy":userData["buy"]}, cb);
    }], callbackFn);
}

function setUserData(userUid, data, callbackFn){//cType
    var redisData = {"reward":data["reward"], "buy":data["buy"]};
    var dbData = {"data":data["data"], "dataTime":data["dataTime"], "status":data["status"], "statusTime":data["statusTime"],"arg":""};
    redis.user(userUid).s("messiah:more").setObj(redisData, function(err, res){
        activityData.updateActivityData(userUid, activityData.PRACTICE_MESSIAH, dbData, callbackFn);
    });
}

function getUserData(userUid, callbackFn){
    var returnData = {"data":0, "dataTime":0, "status":0, "statusTime":0, "reward":{}, "buy":{}}
    async.series([function(cb) {
        getConfig(userUid, function(err, res){
            if(err){
                cb(err);
            } else {
                returnData["dataTime"] = res[0];
                cb(null);
            }
        });
    }, function(cb) {
        activityData.getActivityData(userUid, activityData.PRACTICE_MESSIAH, function(err, res){
            if(err){
                cb(err);
            } else if(res != null && returnData["dataTime"] == res["dataTime"]){
                returnData["data"] = res["data"] -0;
                returnData["status"] = res["status"] -0;
                returnData["statusTime"] = res["statusTime"] -0;
                redis.user(userUid).s("messiah:more").getObj(function(err, res){
                    if(!err && res != null){
                        returnData["reward"] = res["reward"];
                        returnData["buy"] = res["buy"];
                    }
                    cb(err);
                });
            } else {
                cb(null);
            }
        });
    }], function(err, res){
        callbackFn(err, returnData);
    });
}

exports.getConfig = getConfig;//获取配置
exports.addRecord = addRecord;//加参与数
exports.setUserData = setUserData;
exports.getUserData = getUserData;//获取领取奖励状态
