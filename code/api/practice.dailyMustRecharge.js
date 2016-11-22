/**
 * 每日必买接口（每日充值奖励活动--dailyMustRecharge)
 * User: za
 * Date: 15-2-17
 * Time: 下午11:16
 */
var jutil = require("../utils/jutil");
var dailyMustRecharge = require("../model/dailyMustRecharge");
var async = require("async");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var modelUtil = require("../model/modelUtil");
var activityData = require("../model/activityData");

var userVariable = require("../model/userVariable");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var returnData = {};
    var currentConfig;
    var sTime = 0;
    var isAll = 0;
    var key = "";
    var cTypes = [];
    var rewardList = [];
    var day = 0;
    var status = 0;
    var dTime = 0;
    switch(action){
        case "get":
            async.series([
                function(cb){
                    dailyMustRecharge.getConfig(userUid, function(err, res){
                        if (err) cb(err);
                        else {
                            returnData["sTime"] = res[0]-0;
                            returnData["eTime"] = res[1]-0;
                            currentConfig = res[2];
                            returnData["config"] = currentConfig;
                            returnData["loadReward"] = currentConfig["loadReward"];
                            returnData["allStatus"] = {};
                            returnData["cost"] = 0;
                            key = currentConfig["key"]||"";
                            for(var type in currentConfig["allReward"]){
                                cTypes.push(type);
                                returnData["allStatus"][type] = {"num":0, "status":0};//cost:符合条件;num:已领取;status:我的状态
                            }

                            isAll = parseInt(currentConfig["isAll"]) || 0;
                            cb(null);
                        }
                    });
                },
                function(cb){
                    dailyMustRecharge.getUserData(userUid, function(err, res){
                        if(err){
                            cb(err);
                        } else {
                            returnData["status"] = res["status"];
                            returnData["change"] = res["data"];
                            for(var type in returnData["allStatus"]){
                                if(res["allStatus"][type] != undefined){
                                    returnData["allStatus"][type]["status"] = res["allStatus"][type];
                                }
                            }
                            cb(err);
                        }
                    })
                },
                function(cb) {//获取参与数
                    dailyMustRecharge.getRewardNumber(userUid, isAll, key, function(err, res){
                        if(res != null){
                            returnData["cost"] = res - 0;
                        }
                        cb(err);
                    });
                },
                function(cb) {//获取档位状态
                    dailyMustRecharge.getAllStatus(userUid, isAll, key, function(err, res){
                        if (err) cb(err);
                        else {
                            if(res != null){
                                for(var type in returnData["allStatus"]){
                                    if(res[type] != undefined){
                                        returnData["allStatus"][type]["num"] = res[type]-0;
                                    }
                                }
                            }
                            cb(null);
                        }
                    });
                },
                function(cb){
                    dailyMustRecharge.Mark(userUid,returnData["sTime"],function(err,res){
                        if(err)cb("dbError");
                        else{
                            console.log(res,"111111111");
                            returnData["day"] = res["dDayValue"];
                            returnData["loadStatus"] = res["dStatusValue"];
                            cb(null);
                        }
                    });
                }
            ], function(err, res){
                echo(err, returnData);
            });
            break;
        case "reward":
            var limit = 0;//奖励领取条件：充值数界限
            async.series([
                // 获取活动配置数据
                function(cb) {
                    dailyMustRecharge.getConfig(userUid, function(err, res){
                        if (err || res == null) cb("CannotGetConfig");
                        else {
                            currentConfig = res[2];
                            isAll = parseInt(currentConfig["isAll"]);
                            limit = currentConfig["limit"] - 0;
                            key = currentConfig["key"]||"";
                            cb(null);
                        }
                    });
                },
                //获取领取奖励状态
                function(cb) {
                    dailyMustRecharge.getUserData(userUid, function(err, res){//cType
                        if(err){
                            cb(err);
                        } else  if(res["data"] < limit){
                            cb("cannotRecharge");
                        } else if(res["status"] == '1'){
                            cb("haveReceive");
                        } else {
                            cb(null);
                        }
                    });
                },
                function(cb) {
                    var userIP = "127.0.0.1";
                    async.eachSeries(currentConfig["reward"], function(item,forCb) {
                        mongoStats.dropStats(item["id"], userUid, userIP, null, mongoStats.practiceDailyMustRecharge, item["count"], item["level"], item["isPatch"]);
                        modelUtil.addDropItemToDB(item["id"],item["count"],userUid,item["isPatch"], item["level"], function(err,res) {
                            if (err) {
                                forCb(err);
                                console.error(item["id"], item["count"], item["isPatch"], item["level"], err.stack);
                            } else {
                                if(res instanceof Array){
                                    for(var i in res){
                                        rewardList.push(res[i]);
                                    }
                                } else {
                                    rewardList.push(res);
                                }
                                forCb(null);
                            }
                        });
                    }, function(err, res){
                        cb(err, res);
                    });
                },
                function(cb){//标记为已领取
                    dailyMustRecharge.setRewardStatus(userUid, cb);
                },
                function(cb){//增加参与数
                    dailyMustRecharge.setRewardNumber(userUid, isAll, key, cb);
//                },
//                function(cb){
//                    dailyMustRecharge.setAnalytic(userUid, sTime, currentConfig, cb);
                },
                function (cb) {
                    stats.events(userUid, "127.0.0.1", null, mongoStats.dailyMustRecharge1);
                    cb();
                }
            ], function(err,res){
                echo(err,{"rewardList":rewardList});
            });
            break;
        case "allReward":
            var allReward;
            if (jutil.postCheck(postData, "id") == false) {
                echo("postError");
                return false;
            }
            var id = postData["id"];
            async.series([
                // 获取活动配置数据
                function(cb) {
                    dailyMustRecharge.getConfig(userUid, function(err, res){
                        if (err || res == null) cb("CannotGetConfig");
                        else {
                            currentConfig = res[2];
                            isAll = parseInt(currentConfig["isAll"]);
                            allReward = currentConfig["allReward"];
                            key = currentConfig["key"]||"";
                            cb(null);
                        }
                    });
                },
                function(cb){
                    dailyMustRecharge.getRewardNumber(userUid, isAll, key, function(err, res){
                        if(err){
                            cb(err);
                        } else if(res - allReward[id]["cost"] >= 0){
                            cb(null);
                        } else {
                            cb("cannotReward");
                        }
                    });
                },
                //获取个人领取状态
                function(cb) {
                    dailyMustRecharge.getUserData(userUid, function(err, res){//cType
                        if(err){
                            cb(err);
                        } else  if(res["allStatus"][id] != undefined){
                            cb("haveReceive");
                        } else {
                            cb(null);
                        }
                    });
                },
                //获取全服领取状态
                function(cb) {
                    dailyMustRecharge.getAllStatus(userUid, isAll, key, function(err, res){//cType
                        if(err){
                            cb(err);
                        } else  if(res != undefined && res[id] != undefined && allReward[id]["num"] - res[id] <= 0){
                            cb("noReward");
                        } else {
                            cb(null);
                        }
                    });
                },
                //判断伊美加币是否足够
                function(cb) {
                    if(allReward[id]["pay"] - 0 > 0){
                        user.getUser(userUid, function(err, res){
                            if(err){
                                cb(err);
                            } else  if(res["ingot"] - allReward[id]["pay"] < 0){
                                cb("noIngot");
                            } else {//扣钱
                                mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.practiceDailyMustRecharge, allReward[id]["pay"]);
                                user.updateUser(userUid, {"ingot":res["ingot"] - allReward[id]["pay"]}, cb);
                            }
                        });
                    } else {
                        cb(null);
                    }
                },
                function(cb) {
                    var userIP = "127.0.0.1";
                    async.eachSeries(allReward[id]["reward"], function(item,forCb) {
                        mongoStats.dropStats(item["id"], userUid, userIP, null, mongoStats.practiceDailyMustRecharge, item["count"], item["level"], item["isPatch"]);
                        modelUtil.addDropItemToDB(item["id"],item["count"],userUid,item["isPatch"], item["level"], function(err,res) {
                            if (err) {
                                forCb(err);
                                console.error(item["id"], item["count"], item["isPatch"], item["level"], err.stack);
                            } else {
                                if(res instanceof Array){
                                    for(var i in res){
                                        rewardList.push(res[i]);
                                    }
                                } else {
                                    rewardList.push(res);
                                }
                                forCb(null);
                            }
                        });
                    }, function(err, res){
                        cb(err, res);
                    });
                },
                function(cb){//标记为已领取
                    dailyMustRecharge.setAllRewardStatus(userUid, id, cb);
                },
                function(cb){//增加领取数
                    dailyMustRecharge.setAllRewardNumber(userUid, isAll, key, id, cb);
//                },
//                function(cb){
//                    dailyMustRecharge.setAnalytic(userUid, sTime, currentConfig, cb);
                },
                function (cb) {
                    stats.recordWithLevelIndex(id, [mongoStats.dailyMustRecharge2, mongoStats.dailyMustRecharge3, mongoStats.dailyMustRecharge4, mongoStats.dailyMustRecharge5], function (tag) {
                        stats.events(userUid, "127.0.0.1", null, tag);
                    });
                    cb();
                }
            ], function(err,res){
                echo(err,{"rewardList":rewardList});
            });
            break;
        case "load":
            var loadLimit;
            var loadReward = [];
            var sTime = 0;
            async.series([function(cb) {// 获取活动配置数据
                    dailyMustRecharge.getConfig(userUid, function(err, res){
                        if (err || res == null) cb("CannotGetConfig");
                        else {
                            currentConfig = res[2];
                            loadLimit = currentConfig["loadLimit"]-0;
                            loadReward = currentConfig["loadReward"];
                            returnData["reward"] = loadReward;
                            key = currentConfig["key"]||"";
                            isAll = parseInt(currentConfig["isAll"]);
                            sTime =  res[0]-0;;
                            cb(null);
                        }
                    });
            },function(cb){
                dailyMustRecharge.Mark(userUid,sTime,function(err,res){
                    if(err)cb(err);
                    else{
                        day = res["dDayValue"];
                        status = res["dStatusValue"];
                        if(status == 1){//7天连续充值
                            returnData["loadStatus"] = 2;
                            returnData["day"] = loadLimit;
                            userVariable.setVariableTime(userUid,"dStatus",returnData["loadStatus"],jutil.now(),cb);
                        }else if(status == 2){
                            returnData["day"] = day;
                            returnData["loadStatus"] = status;
                            cb("haveReceive");
                        }else{
                            cb("timeNotMatch");
                        }
                    }
                });
            },function(cb){
                var userIP = "127.0.0.1";
                returnData["rewardList"] = [];
                async.eachSeries(loadReward, function(item,forCb) {
                    mongoStats.dropStats(item["id"], userUid, userIP, null, mongoStats.practiceDailyMustRecharge, item["count"], item["level"], item["isPatch"]);
                    modelUtil.addDropItemToDB(item["id"],item["count"],userUid,item["isPatch"], item["level"], function(err,res) {
                        if (err) {
                            forCb(err);
                            console.error(item["id"], item["count"], item["isPatch"], item["level"], err.stack);
                        } else {
                            if(res instanceof Array){
                                for(var i in res){
                                    returnData["rewardList"].push(res[i]);
                                }
                            } else {
                                returnData["rewardList"].push(res);
                            }
                            forCb(null);
                        }
                    });
                }, function(err, res){
                    cb(err, res);
                });
            }],function(err,res){
                echo(err,returnData);
            });
            break;
    }
    function echo(err, res){
        if(err)
            response.echo("practice.dailyMustRecharge", jutil.errorInfo(err));
        else
            response.echo("practice.dailyMustRecharge",res);
    }
}

exports.start = start;