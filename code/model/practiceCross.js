/******************************************************************************
 * 夺宝奇兵模型层（翻牌子活动--cross)
 * Create by za.
 * Create at 15-3-24.
 *****************************************************************************/
/**
 * 1.取配置，判断活动是否开，（活动配置和奖励配置）
 * 2.取userData
 * 3.取人数，充值的即加1
 * 4.取状态，并返回
 * 5.发奖励（1.立即领取--个人，2.邮件发送--全服）
 *
 * **/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");
var bitUtil = require("../alien/db/bitUtil");
var user = require("../model/user");
var gsData = require("../model/gsData");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");

var ACTIVITY_CONFIG_NAME = "practiceCross";

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

//设置用户当前数据
function setUserData(userUid, data, callbackFn){//cType
    var redisData = {"list":data["list"], "index":data["index"], "pay":data["pay"], "item":data["item"], "ingot":data["ingot"], "status":data["status"]};
    var dbData = {"data":data["data"], "dataTime":data["dataTime"], "status":data["times"], "statusTime":data["statusTime"],"arg":""};
    redis.user(userUid).s("cross:more").setObj(redisData, function(err, res){
        activityData.updateActivityData(userUid, activityData.PRACTICE_CROSS, dbData, callbackFn);
    });
}

//获取用户当前数据
function getUserData(userUid, callbackFn){
    var returnData = {"data":0, "times":0, "statusTime":0, "status":0, "index":[], "list":[], "pay":0, "item":0, "ingot":0};
    var sTime;
    var currentConfig;
    var init = true;
    async.series([function(cb) {
        getConfig(userUid, function(err, res){
            sTime = res[0];
            returnData["dataTime"] = sTime;
            currentConfig = res[2];
            cb(null);
        });
    }, function(cb){
        activityData.getActivityData(userUid, activityData.PRACTICE_CROSS, function(err, res){
            if(err){
                cb(err);
                return;
            }
            if(res != null && returnData["dataTime"] == res["dataTime"]){
                init = false;
                returnData["ingot"] = res["data"] -0;
                returnData["times"] = res["status"] -0;//今天已使用次数
                returnData["statusTime"] = res["statusTime"] -0;
            }
            cb(null);
        });
    }, function(cb){
        if(!jutil.compTimeDay(jutil.now(), returnData["statusTime"])){
            returnData["times"] = 0;
            returnData["statusTime"] = jutil.now();
            cb(null);
        } else {
            cb(null);
        }
    }, function(cb){
        redis.user(userUid).s("cross:more").getObj(function(err, res){
            if(!init && res != null){//数据丢失
                returnData["status"] = res["status"];
                returnData["index"] = res["index"];
                returnData["list"] = res["list"];
                returnData["pay"] = res["pay"];
                returnData["ingot"] = res["ingot"];
                returnData["item"] = res["item"];
            }
            cb(err);
        });
    }], function(err, res){
        callbackFn(err, returnData);
    });
}

exports.getConfig = getConfig;//获取配置
exports.getUserData = getUserData;//获取用户数据
exports.setUserData = setUserData;//设置用户数据


