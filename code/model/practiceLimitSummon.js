/******************************************************************************
 * 限时抽将Model层--practiceLimitSummon
 * Create by za.
 * Create at 15-7-1 am 11:28.
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

var ACTIVITY_CONFIG_NAME = "limitSummon";
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
    var returnData = {"data":0, "dataTime":sTime, "status":0, "statusTime":0,"arg":{}};
    activityData.getActivityData(userUid, activityData.PRACTICE_LIMITSUMMON, function(err, res){//取数据
        if(res != null && res["dataTime"] == sTime){
            returnData["data"] = res["data"] - 0;
            returnData["dataTime"] = res["dataTime"] - 0;
            returnData["status"] = res["status"] - 0;
            returnData["statusTime"] = res["statusTime"] - 0;
            redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).getObj(function(err, res){
                if(res != null){
                    returnData["arg"] = res;
                }else{
                    returnData["arg"] = {};
                }
                callbackFn(err, returnData);
            });
        }else{
            callbackFn(err, returnData);
        }
    });
}
//设置用户数据
function setUserData(userUid, data, callbackFn) {
    var arg = data["arg"];
    delete data["arg"];
    activityData.updateActivityData(userUid, activityData.PRACTICE_LIMITSUMMON, data,function(err,res){
        redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).setObj(arg, callbackFn);//setObjex
    });
}
//设置用户积分数据
function addPoint(userUid, point, isAll, endTime, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";
    var number = bitUtil.leftShift(point, 24);//pay
    redis[rk](userUid).z("practice:" + ACTIVITY_CONFIG_NAME + ":rank:" + endTime).add(number, userUid, callbackFn);
}
//排行榜
function getRankList(userUid, isAll, eTime, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";
    redis[rk](userUid).z("practice:" + ACTIVITY_CONFIG_NAME + ":rank:" + eTime).revrange(0, 9, "WITHSCORES", function (err, res) {
        var rankList = [];
        for (var i = 0; i < res.length; i += 2) {
            var number = bitUtil.rightShift(res[i + 1] - 0, 24);
            rankList.push({"userUid": res[i], "number": number});
        }
        async.eachSeries(rankList, function (item, esCb) {
            var mArr = bitUtil.parseUserUid(item["userUid"]);
            try {
                var serverList = require("../../config/" + mArr[0] + "_server.json")["serverList"];
            } catch (err) {
                esCb(null);
                return;
            }
            item["serverName"] = jutil.toBase64(serverList[mArr[1]]["name"]);
            esCb(null);
        }, function (err, res) {
            callbackFn(err, rankList);
        });
    });
}
exports.getConfig = getConfig;//获取配置
exports.getRankList = getRankList;//排行榜
exports.setUserData = setUserData;//设置用户数据
exports.getUserData = getUserData;//获取用户数据
exports.addPoint = addPoint;
