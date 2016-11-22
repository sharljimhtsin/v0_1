/******************************************************************************
 * 宇宙第一排行榜--cosmosEvaluation
 * Create by za.
 * key:actData21
 * Create at 15-1-7.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");
var ACTIVITY_CONFIG_NAME = "cosmosEvaluation";
var bitUtil = require("../alien/db/bitUtil");
var user = require("../model/user");
var gsData = require("../model/gsData");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
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
//添加消费记录
function addRecord(userUid,pay,callbackFn){
    var realPay = pay;
    pay = pay-0;
    var key = "";
    var data = {"data":0};
    var eTime;
    var sTime;
    var isAll = 0;//0为不跨服，1为跨服（根据配置判断）
    var reward;
    async.series([
        // 获取活动配置数据
        function(cb) {
            getConfig(userUid, function(err, res){
                if (err || res == null) cb("CannotGetConfig");
                else {
                    data["dataTime"] = res[0];
                    if(jutil.now() - res[0] > 86400){
                        cb("notOpen");
                        return;
                    }
                    key = res[2]["key"];
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    reward = res[2]["reward"];
                    sTime = res[0];
                    eTime = res[1];
                    cb(null);
                }
            });
        },
        function(cb) {
            activityData.getActivityData(userUid, activityData.PRACTICE_COSMOS, function(err, res){
                if(err){
                    cb(err);
                    return;
                }
                if(res != null && data["dataTime"] == res["dataTime"]){
//                    pay += res["data"]-0;
                    data["data"] = res["data"] -0;
                    //pay += res["data"] -0;
                    pay += data["data"];
                } else if(res != null && data["dataTime"] != res["dataTime"]){
                    data["data"] = pay;
                    data["status"] = 0;
                    data["statusTime"] = 0;
                    data["arg"] = '';
                }
                cb(null);
            });
        },
        function(cb) {
            var time = eTime - jutil.now();
            var number = bitUtil.leftShift(pay,24) + time;//彩票个数
            data["data"] = pay-0;
            async.eachSeries(Object.keys(reward), function(cType, esCb){
                if (jutil.now() < sTime + (cType - 0) * 3600) {
                    if (cType == 12) {
                        stats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.cosmosEvaluation1, realPay);
                    } else if (cType == 21) {
                        stats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.cosmosEvaluation2, realPay);
                    } else {
                        stats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.cosmosEvaluation3, realPay);
                    }
                    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
                    redis[rk](userUid).z("cosmosEva:" + key + ":" + cType).add(number, userUid, esCb);
                }
                else
                    esCb(null);
            }, cb);
            cb(null);
        },
        function(cb) {
            activityData.updateActivityData(userUid, activityData.PRACTICE_COSMOS,data, cb);
        }
    ], function(err,res){
        callbackFn(err,res);
    });
};
//排行榜
function getTopList(userUid, key, isAll, cType, callbackFn){//跟需求来判定排行人数
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).z("cosmosEva:" + key + ":" + cType).revrange(0, 9, "WITHSCORES", function (err, res) {
        var topList = [];
        for(var i = 0; i < res.length; i+=2){
            var number = bitUtil.rightShift(res[i+1]-0,24);
            topList.push({"userUid":res[i],"number":number});
        }
        callbackFn(err, topList);
    });
}
//名次
function getTop(userUid, key, isAll, cType, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).z("cosmosEva:" + key + ":" + cType).revrank(userUid, callbackFn);
}
//消费数
function getNumber(userUid, key, isAll, cType, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).z("cosmosEva:" + key + ":" + cType).score(userUid, function (err, res) {
        var number = bitUtil.rightShift(res - 0, 24);
        callbackFn(err, number);
    });
}
//设置领取奖励状态
function setRewardStatus(userUid, cType, type, callbackFn){
    var arg;
    //获取数据
    activityData.getActivityData(userUid, activityData.PRACTICE_COSMOS, function(err, res){
        if(err){
            callbackFn(err);
            return;
        }
        if(res != null){
            try{
                //三元运算，把参数转换为数组类型
                arg = res["arg"] == ''?[]:JSON.parse(res["arg"]);
            } catch (e){
                arg = [];
            }
            var isset = false;
            for(var i in arg){
                if(arg[i]["cType"] == cType){
                    isset = true;
                    arg[i]["status"+type] = 1;
                }
            }
            if(!isset){
                var data = {"cType":cType}
                data["status"+type] = 1;
                arg.push(data);
            }
            activityData.updateActivityData(userUid, activityData.PRACTICE_COSMOS,{"statusTime":jutil.now(),"arg":JSON.stringify(arg)}, callbackFn);
        }
    });
}
//获取领取奖励状态
function getRewardStatus(userUid, sTime, cType, type, callbackFn){
    var cStatus = 0;
    var arg;
    activityData.getActivityData(userUid, activityData.PRACTICE_COSMOS, function(err, res){
        if(err){
            callbackFn(err);
            return;
        }
        if(res != null && res["dataTime"] == sTime && res["arg"] != ''){
                try{
                    arg = JSON.parse(res["arg"]);
                } catch (e){
                    arg = {};
                }
            for(var i in arg){
                if(arg[i]["cType"] == cType)
                    cStatus = arg[i]["status"+type] == undefined?0:arg[i]["status"+type];
            }
        }
        callbackFn(err,cStatus);
    });
}
//设置数据统计
function setAnalytic(userUid, sTime, config,cType, callbackFn){
    if(parseInt(config["isAll"])){
        var topList = [];
        async.series([
            function(cb){
                getTopList(userUid, config["key"], parseInt(config["isAll"]),cType, function(err, res){
                    for(var i in res){
                        res[i]["top"] = i-0+1;
                        topList.push(res[i]);
                    }
                    cb(null);
                });
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
                gsData.addGSDataInfo(userUid, "cosmosEvaluation", sTime, {"data":JSON.stringify(topList), "status":1}, cb);
            }
        ], callbackFn);
    } else {
        callbackFn(null);
    }
}

exports.getConfig = getConfig;//获取配置
exports.addRecord = addRecord;//添加消费记录
exports.getTopList = getTopList;//排行榜
exports.getTop = getTop;//获取排名
exports.getNumber = getNumber;//消费数
exports.setRewardStatus = setRewardStatus;//设置领取奖励状态
exports.getRewardStatus = getRewardStatus;//获取领取奖励状态
exports.setAnalytic = setAnalytic;//设置数据统计