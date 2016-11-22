/**
 * Created by joseppe on 2015/4/21 11:21.
 *
 * 赛亚娃娃献礼
 */

var async = require("async");
var redis = require("../alien/db/redis");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var jutil = require("../utils/jutil");
var ACTIVITY_CONFIG_NAME = "tribute";


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
    activityData.getActivityData(userUid, activityData.PRACTICE_TRIBUTE, function(err, res){
        var userData = {"data":0, "dataTime":sTime, "status":0, "statusTime":0,"arg":{}};
        if(res != null && res["dataTime"] == sTime){
            if(err){
                callbackFn(err);
            } else {
                userData = res;
                redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).getObj(function(err, res){
                    userData["arg"] = res;
                    if(res == null)
                        userData["arg"] = {};
                    callbackFn(err, userData);
                });
            }
        } else {
            callbackFn(null, userData);
        }
    });
}

function setUserData(userUid, userData, isAll, callbackFn) {
    var arg = userData["arg"];
    delete userData["arg"];
    activityData.updateActivityData(userUid, activityData.PRACTICE_TRIBUTE, userData, function (err, res) {
        redis.user(userUid).s("practice:" + ACTIVITY_CONFIG_NAME).setObjex(userData["statusTime"] - jutil.now(), arg, callbackFn);
        var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";
        var number = parseInt(userData["data"]);
        redis[rk](userUid).z("practice:" + ACTIVITY_CONFIG_NAME + ":rank:" + userData["dataTime"]).add(number, userUid);//userData["data"]
    });
}

function getRanklist(userUid, isAll, eTime, callbackFn) {
    var rk = isAll?(isAll == 2?"country":"loginFromUserUid"):"domain";
    redis[rk](userUid).z("practice:"+ACTIVITY_CONFIG_NAME+":rank:"+eTime).revrange(0 ,19 ,"WITHSCORES",function(err, res){
        var topList = [];
        for(var i = 0; i < res.length; i+=2){
            var number = parseInt(res[i+1]);
            topList.push({"userUid":res[i],"number":number});//res[i+1]
        }
        callbackFn(err, topList);
    });
}

exports.getConfig = getConfig;
exports.getUserData = getUserData;
exports.setUserData = setUserData;
exports.getRanklist = getRanklist;
