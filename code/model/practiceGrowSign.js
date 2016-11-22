/**
 * 新成长基金(类似于签到)
 * User: za
 * Date: 15-7-16
 * Time: 上午11:17
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var user = require("../model/user");
var practice = require("../model/practice");
var async = require("async");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var mongoStats = require("../model/mongoStats");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");

var ACTIVITY_CONFIG_NAME = "growSign";
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
function getUserData(userUid, sTime, eTime, callbackFn) {
    var returnData = {"data":0, "dataTime":sTime, "status":0, "statusTime":eTime,"arg":{}};
    activityData.getActivityData(userUid, activityData.PRACTICE_GROWSIGN, function(err, res){//取数据
        if(res != null && res["dataTime"] == sTime && jutil.now() <= eTime){//判断是否同一期活动
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
    activityData.updateActivityData(userUid, activityData.PRACTICE_GROWSIGN, data,function(err,res){
        redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).setObj(arg, callbackFn);//setObjex
    });
}

exports.getConfig = getConfig;//获取配置
exports.getUserData = getUserData;//获取用户数据
exports.setUserData = setUserData;//设置用户数据

