/**
 * Created by joseppe on 2015/4/17 16:11.
 *
 * 刮刮乐--practice.scratchProcess 刮刮乐物品兑换接口（原聚宝盆兑换）
 */

var async = require("async");
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var scratch = require("../model/practiceScratch");
var user = require("../model/user");
var formation = require("../model/formation");
var modelUtil =  require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var TAG = "practice.scratchProcess";//标签

function start(postData, response, query) {
    if (jutil.postCheck(postData,"index", "itemList") == false) {
        response.echo(TAG,jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var index = postData["index"];
    var itemList = postData["itemList"];
    var sTime;
    var eTime;
    var currentConfig;
    var userData;
    var processConfig;
    var returnData = {};
//    var init = true;
    async.series([function (cb) {
        scratch.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                sTime = res[0]-0;
                eTime = res[1]-0;
                currentConfig = res[2];
                processConfig =currentConfig["exchange"][index];
                if(processConfig == undefined){
                    cb("postError");
                } else {
                    cb(null);
                }
            }
        });
    }, function (cb) {
        var error = null;
        var i,j;
        var items = {};
        for(i in processConfig["item"]){
            items[processConfig["item"][i]["id"]] = processConfig["item"][i]["count"];
        }
        for(i in itemList){
            var itemId = itemList[i]["id"]+"";
            if(itemId.substr(0,2) != 15){
                var itemUids = [];
                for(j in itemList[i]["itemUid"]){
                    if(itemUids.indexOf(itemList[i]["itemUid"][j]) != -1)continue;
                    itemUids.push(itemList[i]["itemUid"][j]);
                    items[itemId]--;
                }
            } else {
                items[itemId] -= itemList[i]["count"];
            }
        }
        for(i in items){
            if(items[i]["count"] > 0){
                error = "postError";
            }
        }
        cb(error);
    }, function (cb) {
        scratch.getUserData(userUid, sTime, false, false, function (err, res) {
            if (err) {
                cb(err);
            } else {
                userData = res;
                userData["dataTime"] = sTime;
                //userData["statusTime"] = eTime;
                if(userData["arg"]["exchange"][index] == undefined){
                    userData["arg"]["exchange"][index] = 0;
                    cb(null);
                } else if(processConfig["times"] - userData["arg"]["exchange"][index] <= 0){
                    cb("timesNotEnough");
                } else {
                    cb(null);
                }
            }
        });
    }, function (cb) {
        user.getUser(userUid, function (err, res) {
//            console.log(res["ingot"],processConfig["ingot"],9456);
            if (err || res == null) {
                cb("dbError");
            } else if (res["ingot"] - processConfig["ingot"] < 0) {
                cb("ingotNotEnough");
            } else if (res["gold"] - processConfig["gold"] < 0) {
                cb("noMoney");
            } else {
                returnData["updateData"] = {"gold":res["gold"], "ingot":res["ingot"]};
                cb(null);
            }
        });
    }, function (cb) {
        var arr = {"skill":{"s":2,"e":3},"equip":{"s":1,"e":3},"card":{"s":1,"e":6}};
        formation.getUserFormation(userUid, function(err, res){
            if(err || res == null)
                cb("dbError");
            else {
                var error = null;
                for(var i in res){
                    for(var key in arr){
                        for(var j = arr[key]["s"]; j <= arr[key]["e"]; j++){
                            for(var ii in itemList){
                                var itemId = itemList[ii]["id"]+"";
                                if(itemId.substr(0,2) != 15 && itemList[ii]["itemUid"].indexOf(res[i][key+j]) != -1){
                                    error = "isUsed";
                                }
                            }
                        }
                    }
                }
                cb(error);
            }
        })
    }, function (cb) {
        scratch.checkItem(userUid, itemList, cb);
    }, function (cb) {
        scratch.processItem(userUid, itemList, cb);
    }, function (cb) {
        userData["arg"]["exchange"][index]++;
        scratch.setUserData(userUid, userData, cb);
    }, function (cb) {
        returnData["updateData"]["ingot"] -= processConfig["ingot"];
        returnData["updateData"]["gold"] -= processConfig["gold"];
        if (processConfig["ingot"] > 0) {
            mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.P_SCRATCH5, processConfig["ingot"] - 0);
        }
        if (processConfig["gold"] > 0) {
            mongoStats.expendStats("gold", userUid, "127.0.0.1", null, mongoStats.P_SCRATCH7, processConfig["gold"] - 0);
        }
        user.updateUser(userUid, returnData["updateData"], cb);
    }, function (cb) {
        returnData["reward"] = {"id":processConfig["id"], "count":processConfig["count"]};
        returnData["rewardList"] = [];
        mongoStats.dropStats(returnData["reward"]["id"], userUid,"127.0.0.1", null, mongoStats.P_SCRATCH6, returnData["reward"]["count"]);
        modelUtil.addDropItemToDB(processConfig["id"], processConfig["count"], userUid, false, 1, function(err, res){//dropId,dropCount,userUid,isPatch,level,callBack
            if(res instanceof Array){//验证res是否为数组
                for(var i in res){
                    returnData["rewardList"].push(res[i]);
                }
            } else if(res) {
                returnData["rewardList"].push(res);
            }
            cb(err);
        });
    }], function (err, res) {
        if (err){
            response.echo(TAG, jutil.errorInfo(err));
        }else {
            response.echo(TAG, returnData);
        }
    });
}

exports.start = start;