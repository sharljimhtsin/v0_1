/**
 * 神龟射射射活动的接口
 * User: za
 * Date: 15-6-16
 * Time: 下午17:30
 */
var jutil = require("../utils/jutil");
var async = require("async");
var fire = require("../model/practiceFire");
var user = require("../model/user");
var formation = require("../model/formation");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var configManager = require("../config/configManager");
var userVariable = require("../model/userVariable");
var stats = require("../model/stats");
function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var currentConfig;
    var top = 0;
    var eTime = 0;
    var sTime = 0;
    var isAll = 0;
    var rewardList = [];
    var reward = "";
    var returnData = {};//返回集合
    var mCount = 0;//奖励个数
    var userData = {};//用户数据
    var singlePay = 0;//单次价格
    var ingot = 0;//玩家活动消耗的金币数
    var rankReward = {};//排行榜信息
    var freeTime = 0;//冷却时间时长
    var lastTime = 0;////玩家点击的时间戳

    switch (action){
        case "get"://配置+userData+[1,10,100]
        default:
            async.series([
                function(cb) {// 取配置
                    fire.getConfig(userUid, function(err, res){
                        if (err) cb(err);
                        else {
                            sTime = res[0]-0;
                            eTime = res[1]-0;
                            currentConfig = res[2];
                            freeTime = currentConfig["freeTime"] -0;
                            rankReward = currentConfig["rankReward"];
                            isAll = parseInt(currentConfig["isAll"])||0;
                            returnData["sTime"] = sTime;
                            returnData["eTime"] = eTime;
                            returnData["config"] = currentConfig;
                            returnData["status"] = "fire";
                            if(eTime - jutil.now() <= 86400*2)//预留两天领排行奖励
                                returnData["status"] = "rank";
                            cb(null);
                        }
                    });
                },
                function(cb){//取用户数据
                    fire.getUserData(userUid ,sTime, function(err,res){
                        if(err||res == null)cb("dbError");
                        else{
                            userData = res;
                            returnData["lastTime"] = userData["statusTime"] + freeTime;
                            cb(null);
                        }
                    });
                }
            ],function(err,res){
                echo(err,returnData);
            });
            break;
        case "fire"://抽奖：1--活动开始第一次免费,2--活动开始后选择10次按钮的话，第一次免费，后9次收费,3--活动开始后选择100次按钮的话，第一次免费，后99次收费
            if (jutil.postCheck(postData, "type") == false) {
                echo("postError");
                return false;
            }
            var type = postData["type"];//档位
            var isFree = false;
            async.series([
                // 获取活动配置数据
                function(cb) {
                    fire.getConfig(userUid, function(err, res){
                        if (err) cb(err);
                        else {
                            sTime = res[0];
                            eTime = res[1];
                            currentConfig = res[2];
                            isAll = parseInt(currentConfig["isAll"])||0;
                            singlePay = currentConfig["singlePay"]-0;
                            rewardList = currentConfig["rewardList"];
                            freeTime = currentConfig["freeTime"] - 0;
                            if(eTime - jutil.now() <= 86400*2){
                                cb("noFireTime");
                            } else {
                                cb(null);
                            }
                        }
                    });
                },
                function(cb){//取用户数据
                    fire.getUserData(userUid, sTime, function(err,res){
                        if (err||res == null) cb("dbError"+"1");
                        else {
                            userData = res;
                            switch (type){
                                case "2":
                                    ingot = currentConfig["tenPay"] - 0;
                                    mCount = 10;
                                    break;
                                case "3":
                                    ingot = currentConfig["hundredPay"] - 0;
                                    mCount = 100;
                                    break;
                                case "1":
                                default :
                                    isFree = jutil.now() >= userData["statusTime"] + freeTime;
                                    ingot = isFree?0:currentConfig["singlePay"] - 0;
                                    mCount = 1;
                                    break;
                            }
                            userData["data"] += mCount;
                            userData["statusTime"] = isFree?jutil.now():userData["statusTime"];
                            cb(null);
                        }
                    });
                },
                function(cb) {//扣钱  &&  记录上一次的免费时间
                    user.getUser(userUid,function(err,res){
                        if (err || res == null) cb("dbError"+"2");
                        else if(res["ingot"] - ingot < 0){
                            cb("ingotNotEnough");
                        } else if(ingot == 0){
                            cb(null);
                        } else {
                            returnData["userData"] = {"ingot":res["ingot"] - ingot};
                            mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.P_FIREROLL4, ingot);
                            user.updateUser(userUid, returnData["userData"], cb);
                        }
                    });
                },
                function(cb){
                    switch (type){
                        case "2":
                            stats.events(userUid,"127.0.0.1",null,mongoStats.P_FIREROLL2);//(userUid, userIP, userInfo, id)
                            break;
                        case "3":
                            stats.events(userUid,"127.0.0.1",null,mongoStats.P_FIREROLL3);
                            break;
                        case "1":
                        default :
                            stats.events(userUid,"127.0.0.1",null,mongoStats.P_FIREROLL1);
                            break;
                    }
                    cb(null);
                },
                function(cb){//设置数据
                    var list = [];
                    while(list.length < mCount){//需求：1,10,100
                        var randomRate = Math.random();
                        var p = 0;
                        for(var i in currentConfig["rewardList"]){
                            p += currentConfig["rewardList"][i]["prob"] - 0;
                            if (randomRate <= p) {
                                list.push({"id":currentConfig["rewardList"][i]["id"],"count":currentConfig["rewardList"][i]["count"]});
                                break;
                            }
                        }
                    }
                    returnData["reward"] = list;
                    returnData["point"] = userData["data"];
                    returnData["lastTime"] = userData["statusTime"];//玩家上一次点击按钮的时间
                    fire.setUserData(userUid, userData, cb);
                },
                function (cb) {//进背包
                    fire.addPoint(userUid, userData["data"], isAll, eTime, cb);
                },
                function (cb) {//进背包
                    returnData["rewardList"] = [];
                    async.eachSeries(returnData["reward"], function (reward, esCb) {
                        mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.P_FIREROLL5, reward["count"]);
                        modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                            if (err) {
                                esCb(err);
                                console.error(reward["id"], reward["count"], err.stack);
                            } else {
                                if (res instanceof Array) {
                                    for (var i in res) {
                                        returnData["rewardList"].push(res[i]);
                                    }
                                } else {
                                    returnData["rewardList"].push(res);
                                }
                                esCb(null);
                            }
                        });
                    }, cb);
                }], function (err, res) {
                echo(err, returnData);//金币，次数，奖励集合，cd时间
            });
            break;
        case "rankList":
            async.series([function(cb){
                fire.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        sTime = res[0]-0;
                        eTime = res[1]-0;
                        currentConfig = res[2];
                        returnData["config"] = currentConfig;
                        isAll = parseInt(currentConfig["isAll"]) || 0;
                        returnData["status"] = "fire";
                        if(eTime - jutil.now() <= 86400*2)
                            returnData["status"] = "rank";
                        cb(null);
                    }
                });
            }, function(cb){
                fire.getUserData(userUid, sTime, function(err,res){
                    returnData["userData"] = res;
                    cb(null);
                });
            },
                function(cb) {
                fire.getRankList(userUid, isAll, eTime, function(err,res){
                    if(err)cb(err);
                    else {
                        returnData["rank"] = 0;
                        for(var i in res){
                            if(res[i]["userUid"] == userUid)
                                returnData["rank"] = i-0+1;
                        }
                        returnData["rankList"] = res;
                        cb(null);
                    }
                });
            }, function(cb) {
                var top = 1;
                async.eachSeries(returnData["rankList"], function(rankData, esCb){
                    rankData["top"] = top;
                    top++;
                    user.getUser(rankData["userUid"], function(err, res){
                        if(err || res == null){
                            esCb("dbError");
                        } else {
                            rankData["userName"] = res["userName"];
                            formation.getUserHeroId(rankData["userUid"], function(err, res){
                                rankData["heroId"] = res;
                                esCb(err);
                            });
                        }
                    });
                }, cb);
            }],function(err,res){
                echo(err, returnData);//返回估价和奖励类型
            });
            break;
        case "rankReward"://排行榜奖励 reward:{},rewardList:{}(类似赛亚娃娃)
            async.series([
                function(cb) { // 获取活动配置数据
                    fire.getConfig(userUid, function(err, res){
                        if (err || res == null) cb("CannotGetConfig");
                        else {
                            sTime = res[0];
                            eTime = res[1]-0;
                            currentConfig = res[2];
                            isAll = parseInt(currentConfig["isAll"]) || 0;
                            rankReward = currentConfig["rankReward"];
                            if(eTime - jutil.now() <= 86400*2){
                                cb(null);
                            } else {
                                cb("noRewardTime");
                            }
                        }
                    });
                },
                function(cb) {//获取领取奖励状态
                    fire.getUserData(userUid, sTime, function(err,res){
                        if(err)cb(err);
                        else if(res["status"] == 1){
                            cb("haveReceive");
                        } else {
                            userData = res;
                            userData["status"] = 1;
                            cb(null);
                        }
                    });
                },
                function(cb) {
                    fire.getRankList(userUid, isAll, eTime, function(err,res){
                        if(err)cb(err);
                        else {
                            returnData["rank"] = 0;
                            for(var i in res){
                                if(res[i]["userUid"] == userUid)
                                    returnData["rank"] = i-0+1;
                            }
                            returnData["reward"] = rankReward[returnData["rank"]];
                            if(returnData["reward"] == undefined){
                                cb("noReward");
                            } else {
                                cb(null);
                            }
                        }
                    });
                },
                function(cb) {
                    fire.setUserData(userUid, userData, cb);
                }, function(cb) {
                    returnData["rewardList"] = [];
                    async.eachSeries(returnData["reward"], function(reward, esCb){
                        mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.P_FIREROLL5, reward["count"]);
                        modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function(err, res){
                            if (err) {
                                esCb(err);
                                console.error(reward["id"], reward["count"], err.stack);
                            } else {
                                if(res instanceof Array){
                                    for(var i in res){
                                        returnData["rewardList"].push(res[i]);
                                    }
                                } else {
                                    returnData["rewardList"].push(res);
                                }
                                esCb(null);
                            }
                        });
                    }, cb);
                }],function(err,res){
                echo(err,returnData);
            });
            break;
    }
    function echo(err, res){
        if(err){
            response.echo("practice.fire", jutil.errorInfo(err));
        } else{
            response.echo("practice.fire", res);
        }
    }
}
exports.start = start;