/******************************************************************************
 * 回归奖励活动model层--practiceRegress
 * Create by za.
 * key:actData23
 * Create at 15-2-9.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var ACTIVITY_CONFIG_NAME = "regress";
var bitUtil = require("../alien/db/bitUtil");
var user = require("../model/user");
var gsData = require("../model/gsData");
var mongoStats = require("../model/mongoStats");
var userVariable = require("../model/userVariable");
//获取配置
function getConfig(userUid,callbackFn){
    // 1.获取活动配置数据
    activityConfig.getConfig(userUid,ACTIVITY_CONFIG_NAME,function(err,res){
        if(err || res ==null)callbackFn("CannotgetConfig");
        else{
            if(res[0]){
                var sTime = res[4];
                var eTime = res[5];
                var activityArg = parseInt(res[1]);
                if(isNaN(activityArg))activityArg = 0;
                var currentConfig = null;
                if(activityArg == -1){
                    // 取数据库配置，如果配置不存在取默认配置
                    currentConfig = res[2]||res[3]["1"];
                }
                else{
                    // 取指定配置，如果配置不存在取默认配置
                    currentConfig = res[3][activityArg]||res[3]["1"];
                }
                if(!currentConfig){
                    callbackFn("configError");
                }else{
                    callbackFn(null,[sTime,eTime,currentConfig]);
                }
            }else{
                callbackFn("notOpen");
            }
        }
    });
}
//设置领取奖励状态
function setRewardStatus(userUid, callbackFn){
    activityData.updateActivityData(userUid,activityData.PRACTICE_REGRESS,{"status":2,"statusTime":jutil.now()},callbackFn);
}
//获取领取奖励状态
function getRewardStatus(userUid, sTime,callbackFn){
    var status = 0;
    activityData.getActivityData(userUid, activityData.PRACTICE_REGRESS, function(err, res){
        if(err){
            callbackFn(err);
            return;
        }
        if(res != null && res["dataTime"] == sTime){
            status = res["status"];
        }
        callbackFn(err,status);
    });
}
//设置上一次登录时间
function setLastLoginTime(userUid, time){
    var reTime = jutil.now();
    var reStatus;
    var sTime;
    var eTime;
    var currentConfig;
    var section = 0;
    var userData = {};
    async.series([function(cb){
        getConfig(userUid, function(err, res){
            if(err){
                cb(err);
            } else {
                sTime = res[0];
                eTime = res[1];
//                console.log("sT:",sTime,"eT:",eTime);
                currentConfig = res[2];
                section = currentConfig["day"]-0;
                cb(null);
            }
        });
    }, function(cb){//统计
        userVariable.getVariableTime(userUid,"regressLog",function(err,res){//玩家状态统计
            if(err)cb("dbError");
            else{
                if(res == null){
                    reStatus = 0;
                }else{
                    var status = res["value"]-0;
                    if(time >= res["time"] && time <= res["time"] + 86400 * 30 && status == 0){//一个月内登录过
                        reStatus = 1;
                    }else if(time >= currentConfig["beginTime"] && time <= currentConfig["endTime"] && status == 1){//活动期间登录过
                        reStatus = 2;
                    }else if((status == 1 || status == 2) && reTime >= currentConfig["endTime"] + 86400 * 30){//又过了一个月后没有登录过的标记为0
                        reStatus = 0;
                    }else{
                        reStatus = status;
                    }
                }
                userVariable.setVariableTime(userUid,"regressLog",reStatus,reTime,cb);
            }
        });
    }, function(cb){
        activityData.getActivityData(userUid, activityData.PRACTICE_REGRESS, function(err, res){
//            console.log(res["dataTime"],res["statusTime"],res);
            if(err){
                cb(err);
            } else if(res == null || res["dataTime"] != sTime && res["status"] == 0){
                cb(null);
            } else {
                cb("meizige");
            }
        });
    }, function(cb){
        userData = {"data":0, "dataTime":sTime, "status":1, "statusTime":eTime};
//        console.log(userData);
//        console.log(time >= sTime - section * 86400,time <= eTime,"????");
//        console.log(sTime,time,eTime,"????");
        user.getUser(userUid, function(err, res){
            if(err || res == null){
                cb("dbError");
            } else if(res["lv"] - currentConfig["lv"] < 0){//等级不够
                cb("meizige");
            } else if(time >= sTime - section * 86400 && time <= eTime){//验证设定时间内是否登录过
                cb("meizige");
            } else {
                cb(null);
            }
        });
    }, function(cb){
        activityData.updateActivityData(userUid, activityData.PRACTICE_REGRESS, userData, cb);
    }], function(err, res){

    });
}
function getLastLogin(userUid,sTime,callbackFn){
    var currentConfig;//回归活动配置
    var type;//老玩家回归的时间点
    var mLog;//保存上一次登录时间
    userVariable.getVariableTime(userUid, "loginLog", function(err, res) {
        mLog = res || {"value":0,"time":0};
        async.series([
            function(cb){
                getRewardStatus(userUid, sTime,function(err, res){
                    if(err){
                        cb(err);
                    }else if(res == 0){//不符合领取条件
                        cb("statusError");
                    }else if(res == 2){//已领取 haveReceive
                        cb("haveReceive");
                    }else if(res == 1){//符合条件
                        cb(null);
                    }
                });
            },
            function(cb){//条件1
                getConfig(userUid, function(err, res){
                    if (err || res == null) cb("CannotGetConfig");
                    else {
                        sTime = res[0]-0;
                        currentConfig = res[2];
                        if(mLog["value"] <= currentConfig["type"] ){
                            cb(null);
                        }else{
                            cb("notOldFriend");
                        }
                    }
                });
            },
            function(cb){//条件2
                user.getUser(userUid, function(err, res){
                    if(currentConfig["lv"] > res["lv"]){
                        cb("userLvNotEnough"); //玩家等级未到
                    } else {
                        cb(null);
                    }
                });
            }
        ], function(err, res){
            callbackFn(err,{"status":true});//{"dataTime":sTime,"status":1,"lastLogin":mLog["value"]}//,mLog["value"]
        });
    });
}


function regressFresh(userUid, callbackFn) {
    var list = {};
    activityConfig.getConfig(userUid,ACTIVITY_CONFIG_NAME,function(err,res){
        if(err || res ==null)callbackFn("CannotgetConfig");
        else{
            if(res[0]){
                callbackFn(null);
            }else{//活动结束
                list = {"data":0, "dataTime":0, "status":0, "statusTime":0};
                activityData.updateActivityData(userUid, activityData.PRACTICE_REGRESS, list, callbackFn);
            }
        }
    });
}
exports.getConfig = getConfig;//获取配置
exports.setRewardStatus = setRewardStatus;//设置领取奖励状态
exports.getRewardStatus = getRewardStatus;//获取领取奖励状态
exports.setLastLoginTime = setLastLoginTime;//设置上一次登录时间
exports.getLastLogin = getLastLogin;//获取上一次登录时间

exports.regressFresh = regressFresh;

