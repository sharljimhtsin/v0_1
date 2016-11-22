/**
 * 刮刮乐--practice.scratch
 * User: za
 * Date: 15-05-22
 * Time: 下午 16:38
 */

var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var practiceScratch = require("../model/practiceScratch");
var item = require("../model/item");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var sTime = 0;//活动开始时间
    var eTime = 0;//活动结束时间
    var activityConfig;//配置
    var returnData = {};//返回初始化数据
    var free = 0;//免费次数上限
    var singlepay = 0;//单次消耗金币数
    var resetTimes = 0;//重置次数
    var userData = {};//用户数据集合
    var mapList = [];//大图的数据集
    var minList = [];//小图数据集
    var rewardList;
    var resetPay;//重置花费档位
    var minLimit = 0;//小图个数上限
    var mapId = 0;//大图id
    var previousData;
    var needRefresh = true;
    var ghostPay = 0;

    switch(action){
        case "reset":
        case "get"://取--初始化 思路：取數據（配置+玩家活動數據），随机小图+大图返回给前端
        default:
            async.series([ function(cb){
                practiceScratch.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        returnData["sTime"] = res[0];
                        returnData["eTime"] = res[1];
                        activityConfig = res[2];
                        free = activityConfig["free"];
                        resetPay = activityConfig["resetPay"];
                        singlepay = activityConfig["singlepay"];
                        rewardList = activityConfig["rewardList"];
                        cb(null);
                    }
                });
            }, function (cb) {
                practiceScratch.getUserData(userUid, returnData["sTime"], false, false, function (err, res) {
                    previousData = res;
                    cb(err);
                });
            }, function(cb){
                for (var i in previousData["arg"]["minList"]) {
                    if (previousData["arg"]["minList"][i]["status"] == 0) {
                        needRefresh = false;
                        break;
                    }
                }
                if (action == "reset"){
                    practiceScratch.getUserData(userUid, returnData["sTime"], false, false, function(err, res){
                        if (err) cb(err);
                        else {
                            resetTimes = res["resetTimes"];
                            res["resetTimes"]++;
                            practiceScratch.setUserData(userUid, res, function(err, res){});
                            var m = resetTimes >= resetPay.length ? resetPay.length-0-1 : resetTimes;//超过重置次数配置取最后一档
                            var reset = resetPay[m] - 0;
                            user.getUser(userUid, function(err, res){
                                if(err || res == null){
                                    cb("dbError");
                                } else if(res["ingot"] - reset < 0){
                                    cb("ingotNotEnough");
                                } else {
                                    returnData["userData"] = {"ingot":res["ingot"] - reset};
                                    stats.events(userUid,"127.0.0.1",null,mongoStats.P_SCRATCH3);
                                    mongoStats.expendStats("ingot", userUid,"127.0.0.1", null, mongoStats.P_SCRATCH5, reset);
                                    user.updateUser(userUid, returnData["userData"], cb);
                                }
                            });
                        }
                    });
                }else if (needRefresh) {//重置
                    practiceScratch.getUserData(userUid, returnData["sTime"], false, false, function(err, res){
                        if (err) cb(err);
                        else {
                            practiceScratch.setUserData(userUid, res, function(err, res){});
                            cb(null);
                        }
                    });
                }else {
                    cb(null);
                }
            }, function(cb){
                var init = (action == "reset" ? true : false || needRefresh);
                practiceScratch.getUserData(userUid, returnData["sTime"], init, false, function(err, res){
                    if (err) cb(err);
                    else if(res["arg"] != null||res["arg"]!=undefined||res["arg"]["minList"] != null||res["arg"]["minList"] != undefined){
                        userData = res;
                        resetTimes = userData["resetTimes"];
                        var m = resetTimes >= resetPay.length ? resetPay.length-0-1 : resetTimes;//超过重置次数配置取最后一档
                        returnData["resetPay"] = resetPay[m];//重置消耗的金币数
                        returnData["free"] = free;
                        if(action == "reset"){
                            userData["resetTimes"]++;
                        }
                        returnData["singlepay"] = singlepay;
                        if(userData["arg"]["allTimes"] < free){
                            returnData["singlepay"] = 0;
                        }
                        returnData["allTimes"] = userData["arg"]["allTimes"];//今日免费次数消耗
                        returnData["mapId"] = userData["arg"]["mapId"];
                        returnData["minList"] = [];
                        var payTimes = 0;
                        for(var i in userData["arg"]["minList"]){
                            var data = {"status":userData["arg"]["minList"][i]["status"],"index":i};
                            //if(userData["arg"]["minList"][i]["status"] == 1)
                            data["reward"] = rewardList[userData["arg"]["minList"][i]["id"]];
                            returnData["minList"].push(data);
                            if(userData["arg"]["minList"][i]["status"] == 0){
                                if(free - userData["arg"]["allTimes"] <= 0){
                                    payTimes++
                                } else {
                                    free--
                                }
                            }
                        }
                        userData["arg"]["ghostPay"] = payTimes * singlepay;
                        returnData["ghostPay"] = userData["arg"]["ghostPay"];
                        practiceScratch.setUserData(userUid, userData, cb);
                    }else{
                        cb("dbError");
                    }
                });
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "convert"://翻奖--立即获得奖励，条件：免费次数用完，扣除金币；金币不足，不能翻
            if (jutil.postCheck(postData,"index") == false) {
                echo("postError");
                return false;
            }
            var index = postData["index"]-0;//小图id:"1001"
            async.series([function(cb){//取配置
                practiceScratch.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        sTime = res[0];
                        activityConfig = res[2];
                        free = activityConfig["free"]-0;//免费次数
                        singlepay = activityConfig["singlepay"] -0;//翻牌单次消耗金币数
                        rewardList = activityConfig["rewardList"];
                        minLimit = activityConfig["minLimit"];//小图个数上限
                        cb(null);
                    }
                });
            }, function(cb){//取用户数据
                practiceScratch.getUserData(userUid, sTime, false,false, function(err, res){
                    if(err)cb(err);
                    else if(res["arg"]["minList"][index]["status"] == 1){
                        cb("haveReceive");//postError
                    } else {
                        userData = res;
                        cb(null);
                    }
                });
            }, function(cb){//扣钱
                user.getUser(userUid,function(err,res){
                    if (err || res == null) cb("dbError");
                    else if(free - userData["arg"]["allTimes"] > 0){
                        cb(null);
                    } else if(res["ingot"] - singlepay < 0){
                        cb("ingotNotEnough");
                    } else {
                        userData["ingot"] += singlepay-0;
                        returnData["userData"] = {"ingot":res["ingot"] - singlepay};
                        mongoStats.expendStats("ingot", userUid,"127.0.0.1", null, mongoStats.P_SCRATCH5, singlepay);
                        user.updateUser(userUid, returnData["userData"], cb);
                    }
                });
            }, function(cb) {
                var id = userData["arg"]["minList"][index]["id"];
                userData["arg"]["minList"][index]["status"] = 1;
                returnData["reward"] = rewardList[id];
                returnData["gStatus"] = "clearMap";
                var payTimes = 0;
                userData["arg"]["allTimes"]++;
                for(var i in userData["arg"]["minList"]){
                    if(userData["arg"]["minList"][i]["status"] == 0){
                        returnData["gStatus"] = null;
                        if(free - userData["arg"]["allTimes"] <= 0){
                            payTimes++
                        } else {
                            free--;
                        }
                    }
                }
                userData["arg"]["ghostPay"] = payTimes * singlepay;
                returnData["ghostPay"] = userData["arg"]["ghostPay"];
                practiceScratch.setUserData(userUid, userData, cb);
            }, function(cb) {
                stats.events(userUid,"127.0.0.1",null,mongoStats.P_SCRATCH1);
                mongoStats.dropStats(returnData["reward"]["id"], userUid,"127.0.0.1", null, mongoStats.P_SCRATCH4, returnData["reward"]["count"]);
                modelUtil.addDropItemToDB(returnData["reward"]["id"], returnData["reward"]["count"], userUid, false, 1, function (err, res) {
                    returnData["rewardList"] = res;
                    cb(null);
                });
            }],function(err,res){
                echo(err, returnData);
            });
            break;
        case "ghost"://一键刮开
            //思路：每張小圖狀態設置為1，實際效果等同於單次刮獎+循環，只是翻開后需要重新拼一個新的圖片序列，發送獎勵到玩家背包，保存后返回給前端
            async.series([function(cb){
                practiceScratch.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        returnData["sTime"] = res[0];
                        returnData["eTime"] = res[1];
                        free = res[2]["free"];
                        singlepay = res[2]["singlepay"];
                        minList = res[2]["list"];//小图奖励
                        mapList = res[2]["mapList"];//大图id
                        rewardList = res[2]["rewardList"];//config
                        cb(null);
                    }
                });
            },
                function(cb){//取用户数据
                practiceScratch.getUserData(userUid, sTime, false,false, function(err, res){
                    if(err)cb(err);
                    else {
                        userData = res;
                        returnData["ghostPay"] = userData["arg"]["ghostPay"];
                        userData["ingot"] += returnData["ghostPay"];
                        returnData["gStatus"] = "clearMap";
                        returnData["reward"] = [];
                        for(var i in userData["arg"]["minList"]){
                            if(userData["arg"]["minList"][i]["status"] == 0){
                                var ind = userData["arg"]["minList"][i]["id"];
                                userData["arg"]["allTimes"]++;
                                userData["arg"]["minList"][i]["status"] = 1;

                                returnData["reward"].push({"id":rewardList[ind]["id"],"count":rewardList[ind]["count"]});
                            }else{
                                continue;
                            }
                        }
                        cb(null);
                    }
                });
            },
                function(cb){
                user.getUser(userUid, function(err, res){
                    if(err || res == null){
                        cb("dbError");
                    } else if(res["ingot"] - returnData["ghostPay"] < 0){
                        cb("ingotNotEnough");
                    } else {
                        returnData["userData"] = {"ingot":res["ingot"] - returnData["ghostPay"]};
                        mongoStats.expendStats("ingot", userUid,"127.0.0.1", null, mongoStats.P_SCRATCH5, returnData["ghostPay"]);
                        user.updateUser(userUid, returnData["userData"], cb);//userdata
                    }
                });
            }, function(cb) {
                practiceScratch.setUserData(userUid, userData, cb);
            }, function (cb) {
                returnData["rewardList"] = [];
                stats.events(userUid,"127.0.0.1",null,mongoStats.P_SCRATCH2);
                async.eachSeries(returnData["reward"], function (reward, esCb) {
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.P_SCRATCH4, reward["count"]);//???
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
                echo(err, returnData);
            });
            break;
    }
    function echo(err, res){
        if(err){
            response.echo("practice.scratch", jutil.errorInfo(err));
        } else{
            response.echo("practice.scratch", res);
        }
    }
}
exports.start = start;