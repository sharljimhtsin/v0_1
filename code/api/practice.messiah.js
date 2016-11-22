/**
 * 赛亚巨献
 * User: joseppe
 * Date: 15-04-14
 * Time: 下午6:42
 */

var async = require("async");
var messiah = require("../model/messiah");
var jutil = require("../utils/jutil");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var modelUtil = require("../model/modelUtil");
var redis = require("../alien/db/redis");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var returnData = {};
    var currentConfig;
    var pay;
    switch(action){
        case "buy":
        case "reward":
            if (jutil.postCheck(postData, "pay") == false) {
                echo("postError");
                return false;
            }
            pay = postData["pay"];
            //var reward;
            var userData;
            var ingot;
            async.series([function(cb){
                messiah.getConfig(userUid, function(err, res){
                    if(err){
                        cb(err);
                    } else {
                        currentConfig = res[2];
                        if(currentConfig[pay] == undefined){
                            cb("notSold");
                        } else {
                            returnData["reward"] = currentConfig[pay][action];
                            ingot = currentConfig[pay]["pay"]-0;
                            cb(null);
                        }
                    }
                });
            }, function (cb) {
                messiah.getUserData(userUid, function(err, res){
                    if(err || res == null){
                        cb("dbError");
                    } else if(res["data"] - pay < 0){
                        cb("postError");
                    } else if(res[action][pay]){
                        cb("haveReceive");
                    } else {
                        userData = res;
                        userData[action][pay] = 1;
                        cb(null);
                    }
                });
            }, function (cb) {
                if(action == "buy"){
                    user.getUser(userUid, function(err, res){
                        if(err || res == null){
                            cb("dbError");
                        } else if(res["ingot"] - ingot < 0){
                            cb("ingotNotEnough");
                        } else {
                            mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.PRACTICE_MESSIAH_BUY, ingot);
                            returnData["ingot"] = ingot = res["ingot"] - ingot;
                            user.updateUser(userUid, {"ingot":ingot}, cb);
                        }
                    });
                } else {
                    cb(null);
                }
            }, function (cb) {
                messiah.setUserData(userUid, userData, cb);
            }, function (cb) {
                returnData["rewardList"] = [];
                async.eachSeries(returnData["reward"], function(item, esCb){
                    mongoStats.dropStats(item["id"], userUid, '127.0.0.1', null, mongoStats.PRACTICE_MESSIAH_GET, item["count"]-0);
                    modelUtil.addDropItemToDB(item["id"], item["count"]-0, userUid, false, 1, function (err, res) {
                        returnData["rewardList"].push(res);
                        esCb(null);
                    });
                }, cb);
            }], function(err, res){
                echo(err, returnData);
            });
            break;
        case "get":
        default :
            async.series([function(cb){
                messiah.getConfig(userUid, function(err, res){
                    if(err){
                        cb(err);
                    } else {
                        currentConfig = res[2];
                        returnData["sTime"] = res[0] - 0;
                        returnData["eTime"] = res[1] - 0;
                        cb(null);
                    }
                });
            }, function (cb) {
                messiah.getUserData(userUid, function(err, res){
                    if(err){
                        cb(err);
                    } else {
                        returnData["pay"] = res["data"];
                        returnData["list"] = {};
                        for(var i in currentConfig){
                            returnData["list"][i] = {"order":i, "reward": currentConfig[i]["reward"], "rewardStatus": (res["reward"][i]?1:0), "buy": currentConfig[i]["buy"], "buyStatus": (res["buy"][i]?1:0), "pay": currentConfig[i]["pay"]};
                        }
                        cb(null);
                    }
                });
            }], function(err, res){
                echo(err, returnData);
            });
            break;
    }

    function echo(err, res){
        if(err)
            response.echo("practice.messiah", jutil.errorInfo(err));
        else
            response.echo("practice.messiah",res);
    }
}

exports.start = start;