/**
 * 金币摩天轮--practice.wheel
 * User: joseppe
 * Date: 15-04-25
 * Time: 下午 17:40
 */

var jutil = require("../utils/jutil");
var async = require("async");
var activityConfig = require("../model/activityConfig");
var practiceWheel = require("../model/practiceWheel");
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
    var currentConfig;//配置
    var sTime = 0;//活动开始时间
    var eTime = 0;//活动结束时间
    var returnData = {};//返回用户初始化数据集合
    var userData = {};//返回用户初始化数据集合
    switch(action){
        case "get"://取--初始化
        default:
            async.series([function(cb){
                practiceWheel.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        returnData["config"] = res[2];
                        returnData["sTime"] = res[0];
                        returnData["eTime"] = res[1];
                        cb(null);
                    }
                });
            }, function(cb) {
                practiceWheel.getUserData(userUid, returnData["sTime"], function(err,res){
                    if(err)cb(err);
                    else{
                        returnData["hasTimes"] = res["data"] - 0;
                        returnData["payTimes"] = res["payTimes"] - 0;
                        //var times = returnData["config"]["times"] - returnData["useTimes"];
                        //returnData["hasTimes"] = times>returnData["times"]?returnData["times"]:times;
                        cb(null);
                    }
                });
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "play"://玩--返还金币
            async.series([function(cb){
                practiceWheel.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        currentConfig = res[2];
                        sTime = res[0];
                        eTime = res[1];
                        cb(null);
                    }
                });
            }, function(cb) {
                practiceWheel.getUserData(userUid, sTime, function(err,res){
                    if(err)cb(err);
                    else{
                        userData = res;
                        //userData["statusTime"] = eTime;
                        if(userData["data"]-0 <= 0){
                            cb("noEnoughUseTimes");
                        } else {
                            userData["data"]--;
                            cb(null);
                        }
                    }
                });
            }, function(cb) {
                //计算结果
                if(userData["winning"] == 100){
                    returnData["index"] = currentConfig["lose100"];
                    userData["winning"] = 0;
                } else if(Math.random()*100 < userData["winning"]){
                    returnData["index"] = currentConfig["win"];
                    userData["winning"] = 0;
                } else {
                    userData["winning"]++;
                    var r = Math.random();
                    var pro = 0;
                    for(var i in currentConfig["rand"]){
                        pro += currentConfig["rand"][i]["pro"]-0;
                        returnData["index"] = i;
                        if(r < pro){
                            break;
                        }
                    }
                }
                returnData["reward"] = [{"id":"ingot","count":currentConfig["rand"][returnData["index"]]["count"]}];
                stats.events(userUid, "127.0.0.1", null, mongoStats.E_WHEEL1);
                stats.recordWithLevelIndex(returnData["index"] - 0 + 1, [mongoStats.E_WHEEL2, mongoStats.E_WHEEL3, mongoStats.E_WHEEL4, mongoStats.E_WHEEL5, mongoStats.E_WHEEL6, mongoStats.E_WHEEL8, mongoStats.E_WHEEL9, mongoStats.E_WHEEL10], function (tag) {
                    stats.events(userUid, "127.0.0.1", null, tag);
                });
                cb(null);
            }, function(cb){
                practiceWheel.setUserData(userUid, userData, cb);
            }, function(cb){
                returnData["rewardList"] = [];
                async.eachSeries(returnData["reward"], function(reward, esCb){
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.E_PRACTICEWHEEL, reward["count"]);
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
                echo(err, returnData);
            });
            break;
    }
    function echo(err, res){
        if(err){
            response.echo("practice.wheel", jutil.errorInfo(err));
        } else{
            response.echo("practice.wheel",res);
        }
    }
}
exports.start = start;