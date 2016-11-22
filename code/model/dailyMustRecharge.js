/******************************************************************************
 * 每日必买模型层（每日充值奖励活动--dailyMustRecharge
 * Create by za.
 * Create at 15-3-3.
 *****************************************************************************/
/**
 * 1.取配置，判断活动是否开，（活动配置和奖励配置）
 * 2.取个人充值数
 * 3.取人数，充值的即加1
 * 4.取状态，并返回
 * 5.发奖励（1.立即领取--个人，2.邮件发送--全服）
 *
 * **/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");
var ACTIVITY_CONFIG_NAME = "dailyMustRecharge";
var bitUtil = require("../alien/db/bitUtil");
var user = require("../model/user");
var gsData = require("../model/gsData");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
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
                var day = Math.floor((jutil.now() - sTime) / 86400) + 1;
                var currentConfig = res[2];
                if(currentConfig["day"+day] != undefined){
                    var isAll = parseInt(currentConfig["isAll"]);
                    var key = currentConfig["key"];
                    var loadReward = currentConfig["loadReward"];
                    var loadLimit = currentConfig["loadLimit"]-0;
                    currentConfig = currentConfig["day"+day];
                    currentConfig["isAll"] = isAll;
                    currentConfig["key"] = key;
                    currentConfig["loadReward"] = loadReward;
                    currentConfig["loadLimit"] = loadLimit;
                }
                callbackFn(null, [sTime, eTime, currentConfig]);
            }else{
                callbackFn("notOpen");
            }
        }
    });
}
//添加充值记录
function addRecord(userUid,pay,callbackFn){
    pay = pay-0;
    var data;
    var currentConfig;
    var loadLimit = 0;
    var limit = 0;
    var key = "";
    var isAll = 0;
    var dStatus = 0;
    var dDay = 0;
    var dDayTime = 0;
    var sTime = 0;
    async.series([
        function(cb){
            getConfig(userUid,function(err,res){
                if(err) cb(err);
                else {
                    currentConfig = res[2];
                    loadLimit = currentConfig["loadLimit"]-0;
                    limit = currentConfig["limit"] - 0;
                    key = currentConfig["key"];
                    isAll = parseInt(currentConfig["isAll"]);
                    sTime = res[0]-0;
                    cb(null);
                }
            });
        },
        // 获取活动配置数据
        function(cb) {
            getUserData(userUid, function(err, res){
                if(err){
                    cb(err);
                } else {
                    data = res;
                    data["data"] += pay;
                    data["arg"] = JSON.stringify(data["allStatus"]);
                    delete data["allStatus"];
                    cb(null);
                }
            })
        },
        function(cb){
            Mark(userUid,sTime,function(err,res){
                if(err)cb("dbError");
                else{
                    dStatus = res["dStatusValue"];
                    dDay = res["dDayValue"];
                    dDayTime = res["dDayTime"];
                    if(data["data"] >= limit){//充值达到上限，天数加1
                        if(dStatus == 2 || dStatus == 1){
                            cb(null);
                        }else{
                            dDay++;
                            if(dStatus == 0 && dDay >= loadLimit){//天数满足条件
                                dStatus++;
                                async.series([function(cBb){
                                    userVariable.setVariableTime(userUid,"dStatus",dStatus,jutil.now(),cBb);
                                },function(cBb){
                                    userVariable.setVariableTime(userUid,"dDay",dDay,jutil.now(),cBb);
                                }],function(err,res){
                                    cb(err,null);
                                });
                            }else{
                                if(jutil.compTimeDay(dDayTime,jutil.now()) == false){
                                    userVariable.setVariableTime(userUid,"dDay",dDay,jutil.now(),cb);
                                }else{
                                    cb(null);
                                }
                            }
                        }
                    }else{
                        cb(null);
                    }
                }
            });
        },
        function (cb) {
            activityData.updateActivityData(userUid, activityData.PRACTICE_DAILYMUSTRECHARGE, data, cb);
        }
    ], function(err,res){
        callbackFn(err,res);
    });
}
//获取参与人数
function getRewardNumber(userUid, isAll, key, callbackFn){//cType
    var rk = isAll?(isAll == 2?"country":"loginFromUserUid"):"domain";//210
    redis[rk](userUid).s("dailyMustRecharge:rewardNumber:" + jutil.todayTime() + ":" + key).get(callbackFn);
}
//设置参与人数
function setRewardNumber(userUid, isAll, key, callbackFn){//cType
    var rk = isAll?(isAll == 2?"country":"loginFromUserUid"):"domain";
    redis[rk](userUid).s("dailyMustRecharge:rewardNumber:" + jutil.todayTime() + ":" + key).incr(callbackFn);
    redis[rk](userUid).s("dailyMustRecharge:rewardNumber:" + jutil.todayTime() + ":" + key).expire(86400);
}
//设置领取奖励状态
function setRewardStatus(userUid, callbackFn){//cType, type,
    activityData.updateActivityData(userUid, activityData.PRACTICE_DAILYMUSTRECHARGE,{"status":1, "statusTime":jutil.now()}, callbackFn);
}
//获取领取奖励状态
function getUserData(userUid, callbackFn){
    var arg;
    var returnData = {"data":0, "allStatus":{}, "dataTime":jutil.todayTime(), "status":0, "statusTime":0};
    async.series([
        function(cb) {
            getConfig(userUid, cb);
        },
        function(cb) {
            activityData.getActivityData(userUid, activityData.PRACTICE_DAILYMUSTRECHARGE, function(err, res){
                if(err){
                    cb(err);
                    return;
                }
                if(res != null && returnData["dataTime"] == res["dataTime"]){
                    returnData["data"] = res["data"] -0;
                    returnData["status"] = res["status"] -0;
                    returnData["statusTime"] = res["statusTime"] -0;
                    if(res["arg"] != ""){
                        try{
                            returnData["allStatus"] = JSON.parse(res["arg"]);
                        } catch(e){

                        }
                    }
                }
                cb(null);
            });
        }
    ], function(err, res){
        callbackFn(err, returnData);
    });
}
//获取档位领取数
function getAllStatus(userUid, isAll, key, callbackFn){
    var name = "dailyMustRecharge:allStatus:";
//    gsData.getActivityConfig(userUid,name,function(err,res){
//        if(err)callbackFn(err);
//        else{
//            if(res == null||res == undefined){
//                gsData.addGSDataInfo(userUid,name,jutil.now(),argsData,callbackFn);
//            }else{}
//        }
//    });
    var rk = isAll?(isAll == 2?"country":"loginFromUserUid"):"domain";
    redis[rk](userUid).h(name + jutil.todayTime() + ":" + key).getObj(callbackFn);
}
//设置个人的全服奖励领取状态
function setAllRewardStatus(userUid, id, callbackFn){
    var data;
    async.series([
        function(cb){
            getUserData(userUid, function(err, res){
                data = res;
                data["allStatus"][id] = 1;
                data["arg"] = JSON.stringify(data["allStatus"]);
                delete data["allStatus"];
                cb(err);
            });
        },
        function(cb){
            activityData.updateActivityData(userUid, activityData.PRACTICE_DAILYMUSTRECHARGE, data, cb);
        }
    ], callbackFn);
}
//设置全服奖励领取数量
function setAllRewardNumber(userUid, isAll, key, id, callbackFn){
    var rk = isAll?(isAll == 2?"country":"loginFromUserUid"):"domain";
    redis[rk](userUid).h("dailyMustRecharge:allStatus:" + jutil.todayTime() + ":" + key).hincrby(id, 1, callbackFn);
    redis[rk](userUid).h("dailyMustRecharge:allStatus:" + jutil.todayTime() + ":" + key).expire(86400);
}
//设置数据统计 --全服充值总人数
function setAnalytic(userUid, sTime, config, callbackFn){
    if(parseInt(config["isAll"])){
        var allStatus = {};
        var cost = 0;
        async.series([
            function(cb){
                getRewardNumber(userUid, 1, function(err, res){
                    cost = res;
                    cb(err);
                });
            },
            function(cb){
                getAllStatus(userUid, 1, function(err, res){
                    allStatus = res;
                    cb(err);
                });
            },
            function(cb){
                gsData.addGSDataInfo(userUid, "dailyMustRecharge", sTime, {"data":JSON.stringify({"cost":cost,"allStatus":allStatus}), "status":1}, cb);
            }
        ], callbackFn);
    } else {
        callbackFn(null);
    }
}
//记录连续多天充值的标记
function Mark(userUid, sTime, callbackFn){
    console.log(sTime,"23322332");
    var returnData = {};
    var startTime = 0;
    var sMark = false;
    var sFirst = false;
    var data = {};
    async.series([function(cb){
            userVariable.getVariableTime(userUid,"dStartTime",function(err,res){
              if(err)cb("dbError");
              else{
                  console.log(res,"333333333333");
                  if(res == null){
                      startTime = sTime;
                      sMark = true;
                      console.log(startTime,"1");
                      userVariable.setVariableTime(userUid,"dStartTime",0,startTime,cb);
                  }else{
                      startTime = res["time"];
                      if(startTime != sTime){
                          startTime = sTime;
                          sMark = true;
                          console.log(startTime,"2");
                          userVariable.setVariableTime(userUid,"dStartTime",0,startTime,cb);
                      }else{
                          cb(null);
                      }
                  }
              }
          });
        },
        function(cb){
            if(sMark == true){
                getUserData(userUid, function(err, res){
                    console.log(res,"23233232");
                    data = res;
                    data["dataTime"] = jutil.now();
                    data["arg"] = JSON.stringify(data["allStatus"]);
                    delete data["allStatus"];
                    activityData.updateActivityData(userUid, activityData.PRACTICE_DAILYMUSTRECHARGE, data, cb);
                });
            }else{
                cb(null);
            }
        },
        function(cb){
            userVariable.getVariableTime(userUid,"dStatus",function(err,res){//0--不可以领,1--可以领，2--领完
                if(err)cb("dbError");
                else{
                    console.log(sMark,"34345434");
                    if(res == null || sMark == true){
                        returnData["dStatusTime"] = 0;
                        returnData["dStatusValue"] = 0;
                        userVariable.setVariableTime(userUid,"dStatus",returnData["dStatusValue"],returnData["dStatusTime"],cb);
                    }else{
                        returnData["dStatusTime"] = res["time"];
                        returnData["dStatusValue"] = res["value"]-0;
                        cb(null);
                    }
                }
            });
        },
        function(cb){
            userVariable.getVariableTime(userUid,"dDay",function(err,res){//充值达到今日上限（limit）增1，根据配置loadLimit作为上限
                if(err)cb("dbError");
                else{
                    if(res == null || sMark == true){
                        returnData["dDayTime"] = 0;
                        returnData["dDayValue"] = 0;
                        userVariable.setVariableTime(userUid,"dDay",returnData["dDayValue"],returnData["dDayTime"],cb);
                    }else{
                        returnData["dDayTime"] = res["time"];
                        returnData["dDayValue"] = res["value"]-0;
                        cb(null);
                    }
                }
            });
        }
    ],function(err,res){
        console.log(returnData,"32434434334");
        callbackFn(null,returnData);
    });
}

exports.getConfig = getConfig;//获取配置
exports.addRecord = addRecord;//添加充值记录
exports.getRewardNumber = getRewardNumber;//参与数
exports.setRewardNumber = setRewardNumber;//加参与数
exports.setRewardStatus = setRewardStatus;//设置个人领取奖励状态
exports.setAllRewardStatus = setAllRewardStatus;//设置全服领取状态
exports.setAllRewardNumber = setAllRewardNumber;//设置全服领取数
exports.getUserData = getUserData;//获取领取奖励状态
exports.setAnalytic = setAnalytic;//设置数据统计
exports.getAllStatus = getAllStatus;

exports.Mark = Mark;