/******************************************************************************
 * 充值排行榜
 * Create by za.
 * Create at 14-12-26.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");
var ACTIVITY_CONFIG_NAME = "rechargeRanking";
var formation = require("../model/formation");
var bitUtil = require("../alien/db/bitUtil");
var gsData = require("../model/gsData");
var user = require("../model/user");
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

//添加充值记录
function addRecordCli(userUid, pay, callbackFn) {
    pay = pay - 0;
    var key = "1";
    var isAll = 0;//0为不跨服，1为跨服（根据配置判断）
    var sTime = 0;
    var eTime = 0;
    var data = {"data": 0, "status": 0, "statusTime": 0, "arg": ""};
    async.series([
        // 获取活动配置数据
        function (cb) {
            getConfig(userUid, function (err, res) {
                if (err || res == null) cb("CannotGetConfig");
                else {
                    sTime = res[0];
                    eTime = res[1];
                    if (res[1] - jutil.now() < 86400 * 2) {
                        cb("notOpen");
                        return;
                    }
                    key = res[2]["key"];
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    cb(null);
                }
            });
        },
        function (cb) {
            redis[isAll ? "loginFromUserUid" : "domain"](userUid).z("recharge:" + key).rem(userUid, function (err, res) {
                cb(err, res);
            });
        },
        function (cb) {
            var time = eTime - jutil.now();
            var number = bitUtil.leftShift(pay, 24) + time;
            redis[isAll ? "loginFromUserUid" : "domain"](userUid).z("recharge:" + key).add(number, userUid, function (err, res) {
                cb(err, res);
            });
        },
        function (cb) {
            activityData.getActivityData(userUid, activityData.PRACTICE_RECHARGE, function (err, res) {
                if (err) {
                    cb(err);
                    return;
                }
                data = res;
                cb(null);
            });
        },
        function (cb) {
            data["data"] = pay - 0;
            activityData.updateActivityData(userUid, activityData.PRACTICE_RECHARGE, data, cb);
        }
    ], function (err, res) {
        callbackFn(err, res);
    });
};

//添加充值记录
function addRecord(userUid,pay,callbackFn){
    pay = pay-0;
    var key = "1";
    var isAll = 0;//0为不跨服，1为跨服（根据配置判断）
    var data = {"data":0,"status":0,"statusTime":0,"arg":""};
    var sTime = 0;
    var eTime = 0;
    async.series([
        // 获取活动配置数据
        function(cb) {
            getConfig(userUid, function(err, res){
                if (err || res == null) cb("CannotGetConfig");
                else {
                    data["dataTime"] = res[0];
                    sTime = res[0];
                    eTime = res[1];
                    if(res[1] - jutil.now() < 86400*2){
                        cb("notOpen");
                        return;
                    }
                    key = res[2]["key"];
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    cb(null);
                }
            });
        },
        function(cb) {
            activityData.getActivityData(userUid, activityData.PRACTICE_RECHARGE, function(err, res){
                if(err){
                    cb(err);
                    return;
                }
                if(res != null && data["dataTime"] == res["dataTime"]){
                    pay += res["data"]-0;
                }
                cb(null);
            });
        },
        function(cb) {
            var time = eTime - jutil.now();
            var number = bitUtil.leftShift(pay,24) + time;
            redis[isAll ? "loginFromUserUid" : "domain"](userUid).z("recharge:" + key).add(number, userUid, function (err, res) {
                data["data"] = pay-0;
                cb(err,res);
            });
        },
        function(cb) {
            activityData.updateActivityData(userUid, activityData.PRACTICE_RECHARGE,data, cb);
        }
    ], function(err,res){
        callbackFn(err,res);
    });
};
// 获取奖励数据
function getRewardData(userUid,key,callbackFn) {
    getConfig(userUid,function(err,res){
        if(err || res ==null)callbackFn("CannotgetConfig")
        else{
            var currentConfig = res[3];
            getTopList(userUid, key, function(err, res){
                if(err){
                    callbackFn(err);
                    return ;
                }
                var top = 1;
                for(var uid in res){
                    if(uid == userUid){
                        break;
                    }
                    top++;
                }
                var reward = null;
                for(var i in currentConfig["reward"]){
                    if(top == currentConfig["reward"][i]){
                        reward = currentConfig["reward"][i]["reward"];
                    }
                }
                callbackFn(err, reward);
            });
        }
    });
}
//排行榜
function getTopList(userUid, key, isAll, callbackFn){//跟需求来判定排行人数
    redis[isAll?"loginFromUserUid":"domain"](userUid).z("recharge:"+key).revrange(0 ,9 ,"WITHSCORES",function(err, res){
        var topList = [];
        for(var i = 0; i < res.length; i+=2){
            var number = bitUtil.rightShift(res[i+1]-0,24);
            topList.push({"userUid":res[i],"number":number});
        }
        callbackFn(err, topList);
    });
}
//名次
function getTop(userUid, key, isAll, callbackFn){
    redis[isAll?"loginFromUserUid":"domain"](userUid).z("recharge:"+key).revrank(userUid,callbackFn);
}
//充值数
function getNumber(userUid, key, isAll, callbackFn){
    redis[isAll?"loginFromUserUid":"domain"](userUid).z("recharge:"+key).score(userUid,function(err, res){
        var number = bitUtil.rightShift(res-0,24);
        callbackFn(err, number);
    });
}
//设置领取奖励状态
function setRewardStatus(userUid,callbackFn){
    activityData.updateActivityData(userUid, activityData.PRACTICE_RECHARGE,{"status":1, "statusTime":jutil.now()}, callbackFn);
}
//获取领取奖励状态
function getRewardStatus(userUid, sTime, callbackFn){
    var status = 0;
    activityData.getActivityData(userUid, activityData.PRACTICE_RECHARGE, function(err, res){
        if(err){
            callbackFn(err);
            return;
        }
        if(res != null && sTime == res["dataTime"]){
            status = res["status"];
        }
        callbackFn(err, status);
    });
}
//设置数据统计
function setAnalytic(userUid, sTime, config, callbackFn){
    if(parseInt(config["isAll"])){
        var topList = [];
        async.series([
            function(cb){
                getTopList(userUid, config["key"], parseInt(config["isAll"]), function(err, res){
                    for(var i in res){
                        res[i]["top"] = i-0+1;
                        topList.push(res[i]);
                    }
                    cb(null);
                })
            },
            function(cb){
                async.eachSeries(topList, function(item, esCb){
                    user.getUser(item["userUid"], function(err, res){
                        item["userName"] = jutil.fromBase64(res["userName"]);
                        var mArr = bitUtil.parseUserUid(item["userUid"]);
                        try {
                            var serverList = require("../../config/" + mArr[0] + "_server.json")["serverList"];
                        } catch(err) {
                            esCb(null);
                            return;
                        }
                        item["serverName"] = serverList[mArr[1]]["name"];
                        esCb(null);
                    })
                }, cb);
            },
            function(cb){
                gsData.addGSDataInfo(userUid, "rechargeRanking", sTime, {"data":JSON.stringify(topList), "status":1}, cb);
            }
        ], callbackFn);
    } else {
        callbackFn(null);
    }
}

exports.getConfig = getConfig;//获取配置
exports.addRecord = addRecord;//添加充值记录
exports.getRewardData = getRewardData;//获取数据
exports.getTopList = getTopList;//排行榜
exports.getTop = getTop;//获取排名
exports.getNumber = getNumber;//获取排名个数
exports.setRewardStatus = setRewardStatus;//设置领取奖励状态
exports.getRewardStatus = getRewardStatus;//获取领取奖励状态
exports.setAnalytic = setAnalytic;//设置数据统计
exports.addRecordCli = addRecordCli;