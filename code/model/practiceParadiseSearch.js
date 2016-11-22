/******************************************************************************
 * 神龙卡片翻翻翻Model层 -- practiceParadiseSearch
 * Create by za.
 * Create at 15-9-18 pm 19:13.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");

var ACTIVITY_CONFIG_NAME = "paradiseSearch";
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
function getUserData(userUid, sTime, isGhost,callbackFn){//init
    var returnData = {"ingot":0, "dataTime":0, "status":0, "statusTime":0, "arg":{}};
    var currentConfig;
    var pokerCount = 0;
    var rewardList = [];
    var specialRewardList = [];
    var showList = [];
    var isNew = true;
    async.series([function(cb) {
        getConfig(userUid, function(err, res){
            sTime = res[0];
            returnData["dataTime"] = sTime;
            currentConfig = res[2];
            pokerCount = currentConfig["pokerCount"];
            rewardList = currentConfig["rewardList"];
            specialRewardList = currentConfig["specialRewardList"];
            cb(null);
        });
    }, function(cb){
        activityData.getActivityData(userUid, activityData.PRACTICE_PARADISESEARCH, function(err, res){
            if(res != null && res["dataTime"] == sTime){
                returnData["ingot"] = res["data"] -0;
                returnData["status"] = res["status"] -0;
                returnData["dataTime"] = res["dataTime"] -0;
                returnData["statusTime"] = res["statusTime"] -0;
                isNew = false;
            }
            cb(err);
        });
    }, function(cb){
        redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).getObj(function(err, res){
//            console.log(isNew,1);
            if(isNew || isGhost) {
                 var arg = {};
                arg["crossCt"] = 0;
                arg["point"] = 0;
                arg["ghostStatus"] = 0;
                arg["specialRewardList"] = specialRewardList;
                var list = [];
                while(list.length < pokerCount){//需求：1,10,100
                    var randomRate = Math.random();
                    var p = 0;
                    for(var i in rewardList){
                        p += rewardList[i]["prob"] - 0;
                        if (randomRate <= p) {
                            list.push({"id":rewardList[i]["id"],"count":rewardList[i]["count"],"status":0});
                            break;
                        }
                    }
                }
                arg["rewardList"] = list;
                arg["showList"] = showList;
                returnData["arg"] = arg;
                redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).setObjex(86400, arg, cb);
            } else {
                returnData["arg"] = res;
                cb(err);
            }
        });
    }], function(err, res){
//        console.log(returnData,"32");
        callbackFn(err, returnData);
    });
}
//设置用户数据
function setUserData(userUid, data, callbackFn) {
    var redisData = data["arg"];
    var dbData = {"data":data["ingot"], "dataTime":data["dataTime"], "status":data["status"], "statusTime":data["statusTime"],"arg":""};
    redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).setObj(redisData, function(err, res){
        activityData.updateActivityData(userUid, activityData.PRACTICE_PARADISESEARCH, dbData, callbackFn);
    });
}
exports.getConfig = getConfig;//获取配置
exports.getUserData = getUserData;//获取用户数据
exports.setUserData = setUserData;//设置用户数据
