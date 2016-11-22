/******************************************************************************
 * 幸福兑换Model层 -- practiceLuckyConvert
 * Create by za.
 * Create at 15-9-1 pm 20:20.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");

var ACTIVITY_CONFIG_NAME = "luckyConvert";
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
//获取用户当前数据
function getUserData(userUid, sTime, init, callbackFn){
    var returnData = {"ingot":0, "dataTime":0, "status":0, "statusTime":0, "arg":{}};
    var currentConfig;
    var shopList;
    var shopListFirst;
    var isAll;
    var isNew = true;//验证是否是新的一期活动
    var convertTimes = 0;//兑换次数
    async.series([function(cb) {
        getConfig(userUid, function(err, res){
            sTime = res[0];
            returnData["dataTime"] = sTime;
            currentConfig = res[2];
            shopList = currentConfig["shopList"];
            shopListFirst = currentConfig["shopListFirst"];
            convertTimes = currentConfig["convertTimes"];
            isAll = parseInt(currentConfig["isAll"]);
            cb(null);
        });
    }, function(cb){
        activityData.getActivityData(userUid, activityData.PRACTICE_LUCKYCONVERT, function(err, res){
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
            if (isNew || init || res == null) {//如果是初始化或者是新的一期活动
                var arg = {};
                arg["ingot"] = 0;//伊美加币消耗
                arg["gold"] = 0;//索尼消耗
                arg["point"] = 0;//奖券个数
                arg["upDateTime"] = sTime + currentConfig["upDateTime"];//上一次更新时间 时间戳（每隔4小时）
                arg["convertTime"] = 0;//过凌晨刷新时间
                arg["convertTimes"] = convertTimes;//兑换奖励次数
                arg["shopListFirst"] = [{"id":shopListFirst[0]["id"],"count":shopListFirst[0]["count"],"type":shopListFirst[0]["type"],"cost":shopListFirst[0]["cost"]}];
                arg["shopList"] = [];
                while(arg["shopList"].length < 7){//需求：1,10,100
                    var randomRate = Math.random();
                    var p = 0;
                    for(var i in shopList){
                        p += shopList[i]["prob"] - 0;
                        if (randomRate <= p) {//增加一个奖励状态
                            arg["shopList"].push({"id":shopList[i]["id"],"count":shopList[i]["count"],"type":shopList[i]["type"],"cost":shopList[i]["cost"],"status":0});
                            break;
                        }
                    }
                }
                returnData["arg"] = arg;
                redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).setObjex(86400, arg, cb);
            } else {
                returnData["arg"] = res;
                cb(err);
            }
        });
    },function(cb){
        if(!jutil.compTimeDay(jutil.now(), returnData["arg"]["convertTime"])){//过凌晨清次数 当前时间与上一次兑换时间作比较
            returnData["arg"]["convertTime"] = jutil.now();
            returnData["arg"]["convertTimes"] = convertTimes;//刷新兑换次数
            cb(null);
        } else {
            cb(null);
        }
    }], function(err, res){
        callbackFn(err, returnData);
    });
}
//设置用户数据
function setUserData(userUid, data, callbackFn) {//isAll
    var redisData = data["arg"];
    var dbData = {"data":data["ingot"], "dataTime":data["dataTime"], "status":data["status"], "statusTime":data["statusTime"],"arg":""};
    redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).setObj(redisData, function(err, res){
        activityData.updateActivityData(userUid, activityData.PRACTICE_LUCKYCONVERT, dbData, callbackFn);
//        redis[isAll ? "loginFromUserUid" : "domain"](userUid).z("practice:" + ACTIVITY_CONFIG_NAME + isAll).add(redisData["convertTimes"], userUid, callbackFn);

//        redis[isAll ? "loginFromUserUid" : "domain"](userUid).z("lucConvert:" + key).add(redisData["convertTimes"], userUid,callbackFn);
    });
}
exports.getConfig = getConfig;//获取配置
exports.getUserData = getUserData;//获取用户数据
exports.setUserData = setUserData;//设置用户数据