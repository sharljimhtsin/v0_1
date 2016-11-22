/**
 * 夺宝奇兵--practice.cross
 * User: za（第二版；第一版已丢失）
 * Date: 15-03-029
 * Time: 下午 14:27
 * 1.get--1.取配置 2.取玩家状态 3.返回卡牌数组
 * 2.cross--1.去除不要的牌，返回结果数组
 * 3.choose--1.替换-显示奖励结果（手中的牌的奖励） 2.不换-去除不要的；（最后两张时，显示底牌的奖励）
 * @param 1.次数，2.底牌，3.估价，4.玩家状态
 */

var equipment = require("../model/equipment");
var jutil = require("../utils/jutil");
var async = require("async");
var item = require("../model/item");
var activityConfig = require("../model/activityConfig");
var practiceCross = require("../model/practiceCross");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var user = require("../model/user");
var userVariable = require("../model/userVariable");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var currentConfig;//配置
    var sTime = 0;//活动开始时间
    //var eTime;
    var listConfig;
    var returnData = {};//返回用户初始化数据集合
    var userData;//返回用户初始化数据集合
    var list = [];
    switch(action){
        case "get"://取--初始化
        default:
            async.series([function(cb){
                practiceCross.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        currentConfig = res[2];
                        currentConfig["sTime"] = res[0];
                        currentConfig["eTime"] = res[1];
                        cb(null);
                    }
                });
            }, function(cb) {
                practiceCross.getUserData(userUid, function(err,res){
                    if(err)cb(err);
                    else{
                        returnData = res;
                        returnData["config"] = currentConfig;
                        cb(null);
                    }
                });
            }, function(cb) {
                user.getUser(userUid,function(err,res){
                    if(err || res == null){
                        cb("dbError");
                    } else {
                        var vip = res["vip"];
                        returnData["allTimes"] = currentConfig["times"][vip];
                        cb(null);
                    }
                });
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "play"://玩--返还金币
            if (jutil.postCheck(postData, "ingot","item") == false) {
                echo("postError");
                return false;
            }
            var ingot = postData["ingot"] - 0;
            var sell = ingot;
            var itemId = postData["item"];
            //var index = postData["index"];
            returnData["list"] = [];

            async.series([function(cb){
                practiceCross.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        currentConfig = res[2];
                        currentConfig["sTime"] = res[0];
                        //currentConfig["eTime"] = res[1];
                        listConfig = currentConfig["list"][ingot+"-"+itemId];
                        if(currentConfig["ingot"].indexOf(ingot+"") == -1 || currentConfig["item"].indexOf(itemId) == -1){
                            cb("postError");
                        } else if(!listConfig) {
                            cb("postError");
                        } else {
                            cb(null);
                        }
                    }
                });
            }, function (cb) {
                stats.recordWithLevelIndex(currentConfig["ingot"].indexOf(ingot + "") + 1, [mongoStats.E_CROSS4, mongoStats.E_CROSS5, mongoStats.E_CROSS6], function (tag) {
                    stats.events(userUid, "127.0.0.1", null, tag);
                });
                stats.recordWithLevelIndex(currentConfig["item"].indexOf(itemId + "") + 1, [mongoStats.E_CROSS1, mongoStats.E_CROSS2, mongoStats.E_CROSS3], function (tag) {
                    stats.events(userUid, "127.0.0.1", null, tag);
                });
                cb();
            }, function(cb) {
                practiceCross.getUserData(userUid, function(err,res){
                    if(err)cb(err);
                    else{
                        userData = res;
                        userData["index"] = [];
                        userData["list"] = returnData["list"];//jutil.deepCopy(currentConfig["list"][ingot+"-"+itemId]);
                        userData["ingot"] = ingot;
                        userData["item"] = itemId;
                        userData["status"] = 1;
                        userData["pay"] = 0;
                        cb(null);
                    }
                });
            }, function(cb) {
                user.getUser(userUid,function(err,res){
                    if(err || res == null){
                        cb("dbError");
                    } else if(!currentConfig["times"][res["vip"]] || currentConfig["times"][res["vip"]] - userData["times"] < 1){
                        cb("noTimes");
                    } else if(res["ingot"] - ingot < 0){
                        cb("ingotNotEnough");
                    } else {
                        userData["times"]++;
                        userData["data"] += ingot;
                        userData["dataTime"] = currentConfig["sTime"];
                        userData["statusTime"] = jutil.now();
                        ingot = res["ingot"] - ingot;
                        cb(null);
                    }
                });
            }, function(cb){//扣钱
                user.updateUser(userUid, {"ingot":ingot},cb);//更新玩家金币数据
                mongoStats.expendStats("ingot",userUid,"127.0.0.1",null,mongoStats.E_CROSS,sell);
            }, function(cb){
                var index = [];
                for(var i = 0; i < listConfig.length; i++){
                    index.push(i);
                    returnData["list"].push(0);
                }
                for(var i = 0; i < listConfig.length; i++){
                    userData["index"].push(index.splice(Math.floor(Math.random()*index.length) , 1).pop());
                }
                practiceCross.setUserData(userUid, userData, cb);
            }],function(err,res){
                echo(err, returnData);
            });
            break;
        case "one"://取--初始化
            async.series([function(cb){
                practiceCross.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        currentConfig = res[2];
                        currentConfig["sTime"] = res[0];
                        currentConfig["eTime"] = res[1];
                        cb(null);
                    }
                });
            }, function(cb) {
                practiceCross.getUserData(userUid, function(err,res){
                    if(err)cb(err);
                    else if(res["status"] != 1){
                        cb("statusError");
                    } else {
                        userData = res;
                        returnData["status"] = userData["status"] = 2;
                        cb(null);
                    }
                });
            }, function(cb) {
                practiceCross.setUserData(userUid, userData, cb);
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "cross"://翻--估价，选牌（1或2张）
            /***
             * 翻牌子--去除不要的牌，返回结果数组
             */
            if (jutil.postCheck(postData,"index") == false) {//"index2",
                echo("postError");
                return false;
            }
            var index = postData["index"];//第一张牌
            returnData["index"] = {};
            async.series([function(cb){
                practiceCross.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        currentConfig = res[2];
                        //listConfig = currentConfig["list"];
                        cb(null);
                    }
                });
            }, function(cb) {
                practiceCross.getUserData(userUid,function(err,res){
                    if(err)cb(err);
                    else {
                        userData = res;
                        var ingot = userData["ingot"];
                        var itemId = userData["item"];
                        returnData["list"] = userData["list"];
                        listConfig = currentConfig["list"][ingot+"-"+itemId];
                        var error = null;
                        if(listConfig == undefined){
                            error = "configError";
                        } else if(userData["status"] < 2){
                            error = "postError";
                        } else {
                            for(var i in index){
                                if(index[i] < 1 || index[i] >= listConfig.length){
                                    error = "postError";
                                } else if(userData["list"][index[i]]){
                                    error = "postError";
                                }
                            }
                        }
                        cb(error);
                    }
                });
            }, function(cb) {
                for(var i in index){
                    userData["list"][index[i]] = listConfig[userData["index"][index[i]]];
                    returnData["index"][index[i]] = userData["list"][index[i]];
                }
                var num = 0;
                userData["status"] = 1;
                var t = 0;
                for(var i = 0; i < listConfig.length; i++){
                    if(userData["list"][i] == 0){
                        num += listConfig[userData["index"][i]]-0;
                        t++
                    } else {
                        userData["status"]++;
                    }
                }
                stats.recordWithLevel(t, {
                    2: 2,
                    4: 4,
                    6: 6,
                    8: 8
                }, false, "", "", [mongoStats.E_CROSS7, mongoStats.E_CROSS8, mongoStats.E_CROSS9, mongoStats.E_CROSS10], function (tag) {
                    stats.events(userUid, "127.0.0.1", null, tag);
                });
                userData["pay"] = 0;
                if(num > 0){
                    userData["pay"] = Math.floor(num / t * currentConfig["payRadio"][t]);
                }
                returnData["status"] = userData["status"];
                returnData["pay"] = userData["pay"];
                if(userData["status"] >= listConfig.length){
                    cb("postError");
                } else {
                    practiceCross.setUserData(userUid, userData, cb);
                }
            }],function(err,res){
                echo(err, returnData);//返回估价和奖励类型
            });
            break;
        case "choose":
            if (jutil.postCheck(postData,"choose") == false) {
                echo("postError");
                return false;
            }
            var choose = postData["choose"];//选择类型
            returnData["reward"] = {"count":0};
            returnData["rewardList"] = [];
            async.series([function(cb) {
                practiceCross.getConfig(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        currentConfig = res[2];
                        cb(null);
                    }
                });
            }, function(cb) {
                practiceCross.getUserData(userUid,function(err,res){
                    if(err)cb(err);
                    else {
                        var ingot = res["ingot"];
                        var itemId = res["item"];
                        listConfig = currentConfig["list"][ingot+"-"+itemId];
                        returnData["reward"]["id"] = res["item"];
                        userData = res;
                        userData["status"]++;
                        returnData["list"] = userData["list"];
                        if(listConfig.length - userData["status"] <= 0){
                            returnData["reward"]["count"] = listConfig[userData["index"][0]];//选择的坑
                            userData["status"] = 0;
                            returnData["index"] = {};
                            returnData["index"][0] = userData["list"][0] = listConfig[userData["index"][0]];
                            for(var i = 1; i < listConfig.length; i++){
                                if(userData["list"][i] == 0){
                                    returnData["index"][i] = userData["list"][i] = listConfig[userData["index"][i]];
                                }
                            }
                        }
                        if(choose){
                            returnData["reward"]["count"] = userData["pay"];
                            userData["status"] = 0;
                            stats.events(userUid, "127.0.0.1", null, mongoStats.E_CROSS11);
                        }
                        returnData["status"] = userData["status"];
                        cb(null);
                    }
                });
            }, function(cb) {
                practiceCross.setUserData(userUid, userData, cb);
            }, function(cb) {
                if(returnData["reward"]["count"] > 0){
                    mongoStats.dropStats(returnData["reward"]["id"], userUid, "127.0.0.1", null, mongoStats.E_CROSS, returnData["reward"]["count"]);
                    modelUtil.addDropItemToDB(returnData["reward"]["id"], returnData["reward"]["count"], userUid, false, 1, function(err, res){
                        if (err) {
                            cb(err);
                            console.error(returnData["reward"]["id"], returnData["reward"]["count"], err.stack);
                        } else {
                            if(res instanceof Array){
                                for(var i in res){
                                    returnData["rewardList"].push(res[i]);
                                }
                            } else {
                                returnData["rewardList"].push(res);
                            }
                            cb(null);
                        }
                    });
                } else {
                    cb(null);
                }
            }], function(err, res){
                echo(err, returnData);
            });
            break;
    }
    function echo(err, res){
        if(err){
            response.echo("practice.cross", jutil.errorInfo(err));
        } else{
            response.echo("practice.cross",res);
        }
    }
}
exports.start = start;