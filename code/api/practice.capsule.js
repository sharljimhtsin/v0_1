/**
 * 欢乐扭蛋活动的接口--practice.capsule
 * User: za
 * Date: 15-8-14
 * Time: 下午22:16
 */
var jutil = require("../utils/jutil");
var async = require("async");
var capsule = require("../model/practicecapsule");
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
    var aCount = 0;//额外1连抽次数
    var bCount = 0;//额外10连抽次数
//    var special = [];//排行奖励（额外的）；
    switch (action) {
        case "get"://配置+userData+[1,10]
        default:
            async.series([
                function (cb) {// 取配置
                    capsule.getConfig(userUid, function (err, res) {
                        if (err) cb(err);
                        else {
                            sTime = res[0] - 0;
                            eTime = res[1] - 0;
                            currentConfig = res[2];
                            isAll = parseInt(currentConfig["isAll"]) || "0";
                            rankReward = currentConfig["rankReward"];
                            returnData["sTime"] = sTime;
                            returnData["eTime"] = eTime;
                            returnData["config"] = currentConfig;
                            returnData["status"] = "capsule";
                            if (eTime - jutil.now() <= 86400 * 2)//预留两天领排行奖励
                                returnData["status"] = "rank";
                            cb(null);
                        }
                    });
                },
                function (cb) {//取用户数据
                    capsule.getUserData(userUid, sTime, function (err, res) {
                        if (err || res == null)cb("dbError");
                        else {
                            userData = res;
                            cb(null);
                        }
                    });
                }
            ], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "buy"://
            async.series([
                function (cb) {// 取配置
                    capsule.getConfig(userUid, function (err, res) {
                        if (err) cb(err);
                        else {
                            sTime = res[0] - 0;
                            eTime = res[1] - 0;
                            currentConfig = res[2];
                            isAll = parseInt(currentConfig["isAll"]) || "0";
                            rankReward = currentConfig["rankReward"];
                            returnData["sTime"] = sTime;
                            returnData["eTime"] = eTime;
                            returnData["config"] = currentConfig;
                            returnData["status"] = "capsule";
                            if (eTime - jutil.now() <= 86400 * 2)//预留两天领排行奖励
                                returnData["status"] = "rank";
                            cb(null);
                        }
                    });
                },
                function (cb) {//取用户数据
                    capsule.getUserData(userUid, sTime, function (err, res) {
                        if (err || res == null)cb("dbError");
                        else {
                            userData = res;
                            cb(null);
                        }
                    });
                }
            ], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "capsule"://打开扭蛋
            if (jutil.postCheck(postData, "type") == false) {
                echo("postError");
                return false;
            }
            var type = postData["type"];//档位
            if (type == null || typeArr.indexOf(type) == -1) {//档位类型判断
                echo("typeInvalid");
                return;
            }
            async.series([
                // 获取活动配置数据
                function (cb) {
                    capsule.getConfig(userUid, function (err, res) {
                        if (err) cb(err);
                        else {
                            sTime = res[0];
                            eTime = res[1];
                            currentConfig = res[2];
                            isAll = parseInt(currentConfig["isAll"]) || 0;
                            if (type == "1" || type == "2") {
                                rewardList = currentConfig["rewardList"];
                            } else if (type == "3" || type == "4") {
                                rewardList = currentConfig["extraRewardList"];
                            }
                            if (eTime - jutil.now() <= 86400 * 2) {//领奖状态时不能抽将
                                cb("nocapsuleTime");
                            } else {
                                cb(null);
                            }
                        }
                    });
                },
                function (cb) {//取用户数据
                    capsule.getUserData(userUid, sTime, function (err, res) {
                        if (err || res == null) cb("dbError" + "1");
                        else {
                            var max = 0;
                            userData = res;
                            switch (type) {
                                case "2"://10连抽
                                    rewardList = currentConfig["tenPay"] - 0;
                                    mCount = 10;
                                    bCount = userData["arg"]["bCount"] == undefined ? 0 : userData["arg"]["bCount"] - 0;
                                    for (var a in rewardList) {
                                        max += rewardList[a]["prob"];
                                    }
                                    if (bCount >= Math.floor(Math.random() * max * 3)) {
                                        bCount = 0;
                                        returnData["status"] = "extra";
                                    }
//                                    else {
//                                        bCount = 1;
//                                        returnData["status"] = "capsule";
//                                    }
                                    stats.events(userUid,"127.0.0.1",null,mongoStats.P_capsule2);
                                    break;
                                case "3"://额外1连抽
                                    ingot = currentConfig["extraSinglePay"] - 0;
                                    mCount = 1;
                                    stats.events(userUid,"127.0.0.1",null,mongoStats.P_capsule3);
                                    break;
                                case "1"://1连抽
                                default :
                                    ingot = currentConfig["singlePay"] - 0;
                                    mCount = 1;
                                    aCount = userData["arg"]["aCount"] == undefined ? 0 : userData["arg"]["aCount"] - 0;
                                    for (var j in rewardList) {
                                        max += rewardList[j]["prob"];
                                    }
                                    if (aCount >= Math.floor(Math.random() * max * 10)) {
                                        aCount = 0;
                                        returnData["status"] = "extra";
                                    }
//                                    else {
//                                        returnData["status"] = "capsule";
//                                        aCount = 1;
//                                    }
                                    stats.events(userUid,"127.0.0.1",null,mongoStats.P_capsule1);
                                    break;
                            }
                            cb(null);
                        }
                    });
                },
                function (cb) {//扣钱
                    user.getUser(userUid, function (err, res) {
                        if (err || res == null) {
                            cb("dbError" + "2");
                        } else if (res["ingot"] - ingot < 0) {
                            cb("ingotNotEnough");
                        } else if (ingot == 0) {
                            cb(null);
                        } else {
                            returnData["userData"] = {"ingot": res["ingot"] - ingot};
                            mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.P_capsule5, ingot);//金币消耗统计点
                            //(dropId, userUid, userIP, userInfo, statsId, count, level, type)
                            user.updateUser(userUid, returnData["userData"], cb);
                        }
                    });
                },
                function (cb) {//普通奖励数据
                    if (type == "1" || type == "2") {
                        var rewardList = jutil.deepCopy(currentConfig["rewardList"]);
                        if (type == "1" && returnData["status"] == "extra") {//显示一连抽奖励数据
                            var extraRewardList = jutil.deepCopy(currentConfig["extraRewardList"]);
                            extraRewardList.sort(function () {
                                return 0.5 - Math.random();
                            });
                            var exlist1 = [];
                            var exlist10 = [];
                            while (exlist1.length < mCount) {//需求：1
                                var randomRate1 = Math.random();
                                var p = 0;
                                for (var i in extraRewardList) {
                                    p += extraRewardList[i]["prob"] - 0;
                                    if (randomRate1 <= p) {
                                        exlist1.push({"id": extraRewardList[i]["id"], "count": extraRewardList[i]["count"]});
                                        exlist10.push({"id": extraRewardList[i]["id"], "count": extraRewardList[i]["count"]*10});
                                        break;
                                    }
                                }
                            }
                            returnData["extraRewardList1"] = exlist1;
                            returnData["extraRewardList10"] = exlist10;
                            userData["arg"]["exlist1"] = exlist1;
                            userData["arg"]["exlist10"] = exlist10;
                        }else if(type == "2" && returnData["status"] == "extra"){//显示十连抽奖励数据
                            var extraRewardList = jutil.deepCopy(currentConfig["extraRewardList"]);
                            extraRewardList.sort(function () {
                                return 0.5 - Math.random();
                            });
                            var exlist1 = [];
                            var exlist10 = [];
                            while (exlist1.length < 1) {//需求：1
                                var randomRate1 = Math.random();
                                var p = 0;
                                for (var i in extraRewardList) {
                                    p += extraRewardList[i]["prob"] - 0;
                                    if (randomRate1 <= p) {
                                        exlist1.push({"id": extraRewardList[i]["id"], "count": extraRewardList[i]["count"]});
                                        exlist10.push({"id": extraRewardList[i]["id"], "count": extraRewardList[i]["count"]*10});
                                        break;
                                    }
                                }
                            }
                            returnData["extraRewardList1"] = exlist1;
                            returnData["extraRewardList10"] = exlist10;
                            userData["arg"]["exlist1"] = exlist1;
                            userData["arg"]["exlist10"] = exlist10;
                        }
                    }else if (type == "3" || type == "4") {
                        var rewardList = jutil.deepCopy(currentConfig["extraList"]);
                    }
                    rewardList.sort(function () {
                        return 0.5 - Math.random();
                    });
                    var list = [];
                    while (list.length < mCount) {//需求：1,10
                        var randomRate = Math.random();
                        var p = 0;
                        for (var i in rewardList) {
                            p += rewardList[i]["prob"] - 0;
                            if (randomRate <= p) {
                                list.push({"id": rewardList[i]["id"], "count": rewardList[i]["count"]});
                                break;
                            }
                        }
                    }
                    if (type == "3") {
                        var q = userData["arg"]["exlist1"];
                        for(var x1 in q){
                            list.push({"id":q[x1]["id"],"count":q[x1]["count"]});
                            break;
                        }
                    }else if(type == "4"){
                        var q10 = userData["arg"]["exlist10"];
                        for(var x10 in q10){
                            list.push({"id":q10[x10]["id"],"count":q10[x10]["count"]});
                            break;
                        }
                    }
//                    for(var x in list){//去重
                    returnData["reward"] = list;
                    userData["data"] = userData["data"] + mCount * 10;//消耗1金币获得10积分
                    returnData["point"] = userData["data"];
                    userData["arg"]["aCount"] = aCount - 0;
                    userData["arg"]["bCount"] = bCount - 0;
                    capsule.setUserData(userUid, userData, cb);
                },
                function (cb) {//添加积分
                    capsule.addPoint(userUid, userData["data"], isAll, eTime, cb);
                },
                function (cb) {//进背包
                    returnData["rewardList"] = [];
                    async.eachSeries(returnData["reward"], function (reward, esCb) {
                        mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.P_capsule6, reward["count"]);
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
    }
    function echo(err, res) {
        if (err) {
            response.echo("practice.capsule", jutil.errorInfo(err));
        } else {
            response.echo("practice.capsule", res);
        }
    }
}
//var typeArr = ["1", "2", "3", "4"];
exports.start = start;