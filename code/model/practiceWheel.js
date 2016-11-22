/**
 * Created by joseppe on 2015/4/25 18:31.
 *
 * 金币摩天轮
 */

var async = require("async");
var redis = require("../alien/db/redis");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var jutil = require("../utils/jutil");
var ACTIVITY_CONFIG_NAME = "wheel";

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

function getUserData(userUid, sTime, callbackFn) {
    function resetUserData(userData){
        var arg = [0,0,0];
        if(userData["arg"] != "")
            arg = userData["arg"].split('|');
        userData["payTimes"] = arg[0]-0;
        userData["payTime"] = arg[1]-0;
        userData["winning"] = arg[2]-0;
        if(!jutil.compTimeDay(userData["payTime"], jutil.now())){//充值时间
            userData["status"] = 0;//充值余数
            userData["payTimes"] = 0;//充值获得次数
        }
        return userData;
    }
    activityData.getActivityData(userUid, activityData.PRACTICE_WHEEL, function(err, res){
        var userData = {"data":0, "dataTime":sTime, "status":0, "statusTime":0,"arg":"", "payTimes":0, "payTime":0, "winning":0};//arg=>0:今日已使用次数,1:上次使用时间,2:胜率0-100
        if(res != null && res["dataTime"] == sTime){
            if(err){
                callbackFn(err);
            } else {
                callbackFn(null, resetUserData(res));
            }
        } else {
            callbackFn(null, resetUserData(userData));
        }
    });
}

function setUserData(userUid, userData, callbackFn) {
    var newUserData = {"data":userData["data"], "dataTime":userData["dataTime"], "status":userData["status"], "statusTime":userData["statusTime"]};
    var arg = [userData["payTimes"], userData["payTime"], userData["winning"]];
    newUserData["arg"] = arg.join("|");
    activityData.updateActivityData(userUid, activityData.PRACTICE_WHEEL, newUserData, callbackFn);
}

function addRecord(userUid, pay, callbackFn){
    pay = pay-0;
    var sTime;
    var eTime;
    var currentConfig;
    var userData;
    async.series([function(cb){
        getConfig(userUid, function(err, res){
            if(err){
                cb(err);
            } else {
                sTime = res[0] - 0;
                eTime = res[1] - 0;
                currentConfig = res[2];
                cb(null);
            }
        });
    }, function(cb) {
        getUserData(userUid, sTime, function(err, res){
            if(err){
                cb(err);
            } else {
                userData = res;
                userData["data"] = userData["data"]-0
                userData["status"] = userData["status"]-0;
                userData["payTimes"] = userData["payTimes"]-0
                userData["payTime"] = userData["payTime"]-0;
                userData["statusTime"] = eTime;
                cb(null);
            }
        });
    }, function(cb) {
        var payTimes = Math.floor((pay + userData["status"]) / currentConfig["pay"])-0;
        userData["payTimes"] += payTimes;
        if(userData["payTimes"] - currentConfig["times"] >= 0){
            payTimes = currentConfig["times"] - 0 + payTimes - userData["payTimes"];
            userData["payTimes"] = currentConfig["times"]-0;
        }
        userData["data"] += payTimes;
        userData["status"] = (pay + userData["status"])%currentConfig["pay"];
        userData["payTime"] = jutil.now();
        setUserData(userUid, userData, cb);
    }], callbackFn);
}

exports.getConfig = getConfig;
exports.getUserData = getUserData;
exports.setUserData = setUserData;
exports.addRecord = addRecord;