/******************************************************************************
 * 神龟射射射Model层
 * Create by za.
 * Create at 15-6-16 pm17:30.
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

var ACTIVITY_CONFIG_NAME = "fire";
//获取配置
function getConfig(userUid,callbackFn){
    // 1.获取活动配置数据
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
    var returnData = {"data":0, "dataTime":sTime, "status":0, "statusTime":0};
    activityData.getActivityData(userUid, activityData.PRACTICE_FIRE, function(err, res){//取数据
        if(res != null && res["dataTime"] == sTime){
            returnData["data"] = res["data"] - 0;
            returnData["dataTime"] = res["dataTime"] - 0;
            returnData["status"] = res["status"] - 0;
            returnData["statusTime"] = res["statusTime"] - 0;
        }
        callbackFn(err, returnData);
    });
}
//设置用户数据
function setUserData(userUid, data, callbackFn) {
    activityData.updateActivityData(userUid, activityData.PRACTICE_FIRE, data, callbackFn);
}
//设置用户数据
function addPoint(userUid, point, isAll, endTime, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "countryForDynamic" : "countryForDynamic") : "dynamic";
    var time = endTime  - jutil.now();//eTime
    var number = bitUtil.leftShift(point,24) + time;//pay
    redis[rk](userUid).z("practice:" + ACTIVITY_CONFIG_NAME + ":rank:" + endTime).add(number, userUid, callbackFn);//userData["data"]
}
//排行榜
function getRankList(userUid, isAll,eTime, callbackFn){
    var rk = isAll ? (isAll == 2 ? "countryForDynamic" : "countryForDynamic") : "dynamic";
    redis[rk](userUid).z("practice:"+ACTIVITY_CONFIG_NAME + ":rank:"+eTime).revrange(0 ,9 ,"WITHSCORES",function(err, res){
        var rankList = [];
        for(var i = 0; i < res.length; i+=2){
//            var number = res[i+1]-0;
            var number = bitUtil.rightShift(res[i+1]-0,24);
            rankList.push({"userUid":res[i],"number":number});
        }
        callbackFn(err, rankList);
    });
}
exports.getConfig = getConfig;//获取配置
exports.getRankList = getRankList;//排行榜
exports.setUserData = setUserData;//设置用户数据
exports.getUserData = getUserData;//获取用户数据
exports.addPoint = addPoint;