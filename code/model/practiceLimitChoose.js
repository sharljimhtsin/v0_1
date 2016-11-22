/**
 * Created with JetBrains WebStorm.
 * 限时礼包model--practiceLimitChoose
 * User: za
 * Date: 16-5-13
 * Time: 下午13:59
 * To change this template use File | Settings | File Templates.
 */
var async = require("async");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");
var bitUtil = require("../alien/db/bitUtil");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var ACTIVITY_CONFIG_NAME = "limitChoose";
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
//获取用户数据
function getUserData(userUid, callbackFn) {
    var returnData = {"data":0, "dataTime":0, "status":0, "statusTime":0,"arg":{}};
    var rk = "";
    var dayNo = 0;
    var sTime = 0;
    var currentConfig;
    var key = "";
    var isAll = 0;
    var chooseList = {};
    var limitA = 0;
    var limitB = 0;
    var isNew = true;
    async.series([function(cb){
        getConfig(userUid,function(err,res){
            if(err)cb(err);
            else{
                sTime = res[0];
                currentConfig = res[2];
                key = currentConfig["key"];
                isAll = parseInt(currentConfig["isAll"]);
                rk = isAll?(isAll == 2?"country":"loginFromUserUid"):"domain";
                chooseList = currentConfig["chooseList"];
                dayNo = Math.floor((jutil.now() - sTime) / 86400);
                limitA = chooseList["day"+dayNo][1]["limitA"]-0;
                limitB = chooseList["day"+dayNo][2]["limitB"]-0;
                cb(null);
            }
        });
    },function(cb){
        activityData.getActivityData(userUid, activityData.PRACTICE_LIMITCHOOSE, function(err, res){
            if(res != null && res["dataTime"] == sTime){
                returnData["ingot"] = res["data"] -0;
                returnData["resetTimes"] = res["status"] -0;
                returnData["dataTime"] = res["dataTime"] -0;
                returnData["statusTime"] = res["statusTime"] -0;
                isNew = false;
            }
            cb(err);
        });
    },function(cb){
        redis[rk](userUid).h("practice:" + ACTIVITY_CONFIG_NAME + key).get(userUid, function(err,res){
//            console.log(isNew , !jutil.compTimeDay(jutil.now(),res["nowTime"]),res["nowTime"],res,"4444");
            if(isNew || !jutil.compTimeDay(jutil.now(),res["nowTime"])){
                returnData["arg"] = {"dayNo":dayNo,"nowTime":jutil.now(),"limitA":limitA,"limitB":limitB};
                async.series([
                    function(cb){
                        redis[rk](userUid).h("practice:" + ACTIVITY_CONFIG_NAME + key).set(userUid,returnData["arg"], cb);
                    },function(cb){
                        activityData.updateActivityData(userUid, ACTIVITY_CONFIG_NAME, returnData, cb);
                    }
                ],function(err,res){
                    cb(err,null);
                });
            }else{
                returnData["arg"] = res;
                cb(err);
            }
        });
    }],function(err,res){
        callbackFn(err,returnData);
    });
}
//设置用户数据
function setUserData(userUid,isAll, key, data, callbackFn) {
    var rk = isAll?(isAll == 2?"country":"loginFromUserUid"):"domain";
    var arg = data["arg"];
    delete data["arg"];
    activityData.updateActivityData(userUid, activityData.PRACTICE_LIMITCHOOSE, data,function(err,res){
        redis[rk](userUid).h("practice:" + ACTIVITY_CONFIG_NAME + key).set(userUid,arg, callbackFn);
    });
}
exports.getConfig = getConfig;//获取配置
exports.getUserData = getUserData;//获取用户数据
exports.setUserData = setUserData;//设置用户数据