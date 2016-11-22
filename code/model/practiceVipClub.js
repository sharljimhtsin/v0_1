/******************************************************************************
 * vip俱乐部--practiceVipClub
 * Create by za.
 * key:actData37
 * Create at 15-5-12.
 *****************************************************************************/

var async = require("async");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var mongoStats = require("../model/mongoStats");
var mail = require("../model/mail");
var ACTIVITY_CONFIG_NAME = "vipClub";

//获取配置
function getConfig(userUid,callbackFn){
    // 1.获取活动配置数据
    activityConfig.getConfig(userUid,ACTIVITY_CONFIG_NAME,function(err,res){
        if(err || res ==null)callbackFn("CannotgetConfig");
        else{
            if(res[0]){
                if(!res[2]){
                    callbackFn("configError");
                }else{
                    callbackFn(null,[res[4],res[5],res[2]]);
                }
            }else{
                callbackFn("notOpen");
            }
        }
    });
}
//添加充值记录
function addRecord(userUid,goodId,pay,callbackFn){
    pay = pay-0;
    var data = {"data":0,"dataTime":0,"status":0,"statusTime":0,"arg":{}}
    var arg = {};
    var eTime;
    var sTime;
    var currentConfig;
    var rate = 0;
    async.series([
        // 获取活动配置数据
        function(cb) {
            getConfig(userUid, function(err, res){
                if (err || res == null) cb("CannotGetConfig");
                else {
                    data["dataTime"] = res[0];
                    sTime = res[0];
                    eTime = res[1];
                    currentConfig = res[2];//数据源：0--已充值，2--双倍，3--3倍,以此类推
                    if(currentConfig[goodId] == undefined){
                        cb("noConfig");
                    } else {
                        rate = currentConfig[goodId]-1;
                    }
                    cb(null);
                }
            });
        },
        function(cb) {
            activityData.getActivityData(userUid, activityData.PRACTICE_VIPCLUB, function(err, res){
                if(err){
                    cb(err);
                }else{
                    if(res["dataTime"] == 0){
                        res["dataTime"] = sTime;
                    }
                    if(res != null && data["dataTime"] == res["dataTime"]){
                        data = res;
                        data["data"] = data["data"] - 0;
                        data["data"] += pay * rate;
                        try{
                            arg = JSON.parse(data["arg"]);
                        } catch (e){
                            arg  = {};
                        }
                        if(arg[goodId] == undefined){
                            cb(null);
                        } else {
                            cb("alreadyPay");
                        }
                    } else {
                        data["data"] += pay * rate;
                        cb(null);
                    }
                }
            });
        },
        function(cb) {////读配置文本
            var count = pay*rate;
//            mail.addMail(userUid, -1, "vipClub奖励", JSON.stringify([{"ingot":pay * rate}]),"150513",cb);
            var configManager = require("../config/configManager");
            var jutil = require("../utils/jutil");
            var configData = configManager.createConfig(userUid);
            var mailConfig = configData.getConfig("mail");
            var message = mailConfig["vipClubRewardStr"];//jutil.formatString()
            var reward = JSON.stringify([{"id":"ingot","count":count}]);
            mongoStats.dropStats("ingot", userUid, '127.0.0.1', null, mongoStats.E_VIPCLUB,count,null,null);//(dropId, userUid, userIP, userInfo, statsId, count, level, type)
            mail.addMail(userUid, -1,message,reward,"123456",cb);//(userUid,sender,message,reward,rewardId,callbackFn)

        },
        function(cb){
            arg[goodId] = 0;
            data["arg"] = JSON.stringify(arg);
            activityData.updateActivityData(userUid, activityData.PRACTICE_VIPCLUB, data, cb);
        }
    ], function(err,res){
        callbackFn(err,res);
    });
}
//取用户数据
function getUserData(userUid, sTime,callbackFn){
    var arg = {};
    activityData.getActivityData(userUid, activityData.PRACTICE_VIPCLUB, function(err, res){
        if(res != null && res["dataTime"] == sTime){
            try{
                arg = JSON.parse(res["arg"]);
            } catch (e){
                arg  = {};
            }
        }
        callbackFn(err, arg);
    });
}

exports.getConfig = getConfig;//获取配置
exports.addRecord = addRecord;//添加消费记录
exports.getUserData = getUserData;//取用户数据
