/******************************************************************************
 * vip黑洞Model层--practiceDarker
 * Create by za.
 * Create at 15-11-3 pm 18:44.
 *****************************************************************************/
var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");
var formation = require("../model/formation");
var bitUtil = require("../alien/db/bitUtil");
var gsData = require("../model/gsData");
var user = require("../model/user");
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");

var ACTIVITY_CONFIG_NAME = "practiceDarker";
//获取配置
function getConfig(userUid,callbackFn){
    activityConfig.getConfig(userUid, ACTIVITY_CONFIG_NAME, function(err,res){
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
//取用户数据
function getUserData(userUid, sTime, callbackFn) {
    var returnData = {"data":0, "dataTime":sTime, "status":0, "statusTime":0,"arg":{}};
    var currentConfig;
    var quitTime = 0;
    var quitTimes = 0;
    var isNew = true;//验证是否是新的一期活动
    async.series([function(cb){
        getConfig(userUid, function(err, res){
            sTime = res[0];
            returnData["dataTime"] = sTime;
            currentConfig = res[2];
            cb(null);
        });
    },function(cb){
        activityData.getActivityData(userUid, activityData.PRACTICE_DARKER, function(err, res){//取数据
            if(res != null && res["dataTime"] == sTime){
                returnData["data"] = res["data"] - 0;
                returnData["dataTime"] = res["dataTime"] - 0;
                returnData["status"] = res["status"] - 0;
                returnData["statusTime"] = res["statusTime"] - 0;
                returnData["arg"] = res["arg"];
                if(!jutil.compTimeDay(jutil.now(), returnData["arg"]["quitTime"])){//过凌晨清次数
                    returnData["arg"]["quitTime"]  = jutil.now();//刷新上一次放弃的时间
                    returnData["arg"]["quitTimes"]  = quitTimes;//刷新放弃次数 freeTimes
                    returnData["arg"]["freeTimes"]  = currentConfig["freeTimes"]-0;
                }
                isNew = false;
                cb(null);
            }else{
                returnData["data"] = res["data"] - 0;
                returnData["dataTime"] = res["dataTime"] - 0;
                returnData["status"] = res["status"] - 0;
                returnData["statusTime"] = res["statusTime"] - 0;
                var obj;
                redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).getObj(function(err, res){
//                    console.log(isNew,res,"456456465");
                    if (isNew||res == null) {
                        try {
                            var arg = {};
                            arg["freeTimes"] = currentConfig["freeTimes"]-0;
                            arg["quitTime"] = quitTime;//刷新上一次放弃的时间
                            arg["quitTimes"] = quitTimes;//刷新放弃次数 freeTimes
                            obj = arg;
                            var jsonObj = JSON.parse(obj);
                        } catch (e) {
                            jsonObj = null;
                        } finally {
                            obj = jsonObj;
                            returnData["arg"] = obj;
//                            console.log(obj,returnData,jsonObj,"909009");
                            activityData.updateActivityData(userUid,activityData.PRACTICE_DARKER,returnData,function(err,res){
                                redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).setObjex(86400, obj, cb);
                            });
                        }
                    } else {
                        returnData["arg"] = res["arg"];
//                        console.log(!jutil.compTimeDay(jutil.now(), returnData["arg"]["quitTime"]),"yanz");
                        if(!jutil.compTimeDay(jutil.now(), returnData["arg"]["quitTime"])){//过凌晨清次数
                            returnData["arg"]["quitTime"]  = jutil.now();//刷新上一次放弃的时间
                            returnData["arg"]["quitTimes"]  = quitTimes;//刷新放弃次数 freeTimes
                            returnData["arg"]["freeTimes"]  = currentConfig["freeTimes"]-0;
                        }
                        cb(null);
                    }
                });
            }
        });
    }
//        function(cb){
//        redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).getObj(function(err, res){
//            console.log(res,"2");
//            if (isNew) {//如果是初始化或者是新的一期活动
//                console.log("tttt");
//                var arg = {};
//                arg["freeTimes"] = currentConfig["freeTimes"]-0;
//                arg["quitTime"] = quitTime;//刷新上一次放弃的时间
//                arg["quitTimes"] = quitTimes;//刷新放弃次数 freeTimes
//                returnData["arg"] = arg;
//                redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).setObjex(86400, arg, cb);
//            } else {
//                console.log("ffff");
//                returnData["arg"] = res;
//                cb(err);
//            }
//        });
//    },

//        function(cb){
//        if(!jutil.compTimeDay(jutil.now(), returnData["arg"]["quitTime"])){//过凌晨清次数
//            returnData["arg"]["quitTime"]  = jutil.now();//刷新上一次放弃的时间
//            returnData["arg"]["quitTimes"]  = quitTimes;//刷新放弃次数 freeTimes
//            returnData["arg"]["freeTimes"]  = currentConfig["freeTimes"]-0;
//            cb(null);
//        } else {
//            cb(null);
//        }
//    }
    ], function(err, res){
//        console.log(returnData,"3");
        callbackFn(err, returnData);
    });
}
//设置用户数据
function setUserData(userUid, data, callbackFn) {
    var arg = JSON.stringify(data["arg"]);
//    console.log(arg,"4");
    activityData.updateActivityData(userUid, activityData.PRACTICE_DARKER, data,function(err,res){
        redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).setObj(arg, callbackFn);//setObjex
    });
}
exports.getConfig = getConfig;//获取配置
exports.setUserData = setUserData;//设置用户数据
exports.getUserData = getUserData;//获取用户数据
