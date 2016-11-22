/******************************************************************************
 * 龙神祝福活动Model层 -- practiceEndorse
 * Create by za.
 * Create at 15-9-29 pm 18:45.
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

var ACTIVITY_CONFIG_NAME = "practiceEndorse";
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
    var vipCount = 0;
    var payPoint = 0;
    var endorseTime = 0;
    var vipList = [];
    var vip = 0;
    var currentConfig = [];
    var isNew = true;//验证是否是新的一期活动
    async.series([function(cb){
        getConfig(userUid, function(err, res){
            sTime = res[0];
            returnData["dataTime"] = sTime;
            currentConfig = res[2];
            vipList = currentConfig["vipList"];
            user.getUser(userUid,function(err,res){
                if(err||res == null)cb("dbError");
                else{
                    vip = res["vip"]-0;
                    vipCount = vipList[vip];
//                    console.log(vipCount,"vipCount");
                    cb(null);
                }
            });
        });
    },function(cb) {
        activityData.getActivityData(userUid, activityData.PRACTICE_ENDORSE, function(err, res){//取数据
            if(res != null && res["dataTime"] == sTime){//判断是否同一期活动
                returnData["data"] = res["data"] - 0;
                returnData["dataTime"] = res["dataTime"] - 0;
                returnData["status"] = res["status"] - 0;
                returnData["statusTime"] = res["statusTime"] - 0;
                isNew = false;
            }
            cb(err);
        });
    },function(cb){
        redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).getObj(function(err, res){
//            console.log(isNew,"465456456");
            if (isNew){
                var arg = {};
                arg["endorseTime"] = endorseTime;
                arg["vipPoint"] = vipCount;// - returnData["arg"]["vipPoint"];//刷新vip次数
                arg["payPoint"] = payPoint;
                returnData["arg"] = arg;
                redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).setObjex(86400, arg, cb);
            } else {
                returnData["arg"] = res;
                cb(err);
            }
        });
    },function(cb){
        if(!jutil.compTimeDay(jutil.now(), returnData["arg"]["endorseTime"])){//过凌晨清次数
            returnData["arg"]["endorseTime"]  = jutil.now();//刷新时间
            returnData["arg"]["vipPoint"] = vipCount;// - returnData["arg"]["vipPoint"];//刷新vip次数
            returnData["arg"]["payPoint"] = payPoint;
            returnData["arg"]["vip"] = vip;
//            console.log(returnData["arg"]["vipPoint"],"1");
            cb(null);
        } else {
//            console.log("OneDay","2");
            cb(null);
        }
    }], function(err, res){
        callbackFn(err, returnData);
    });
}
//设置用户数据
function setUserData(userUid, data, callbackFn) {
    var arg = data["arg"];
    delete data["arg"];
    activityData.updateActivityData(userUid, activityData.PRACTICE_ENDORSE, data,function(err,res){
        redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).setObj(arg, callbackFn);//setObjex
    });
}
exports.getConfig = getConfig;//获取配置
exports.setUserData = setUserData;//设置用户数据
exports.getUserData = getUserData;//获取用户数据
