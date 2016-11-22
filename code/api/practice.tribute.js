/**
 * 赛亚娃娃献礼--practice.tribute
 * User: joseppe
 * Date: 15-04-21
 * Time: 下午 16:41
 */

var jutil = require("../utils/jutil");
var async = require("async");
var tribute = require("../model/practiceTribute");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var item = require("../model/item");
var user = require("../model/user");
var formation = require("../model/formation");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var currentConfig;
    var sTime;
    var eTime;
    var returnData = {};
    var userData;
    var heroId;
    var isAll;
    switch(action){
        case "get"://取数据
        default:
            async.series([function(cb){
                tribute.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        currentConfig = res[2];
                        returnData["config"] = currentConfig;
                        sTime = res[0]-0;
                        returnData["sTime"] = sTime;
                        eTime = res[1]-0;
                        returnData["eTime"] = eTime;
                        returnData["status"] = "present";
                        if(eTime - jutil.now() <= 86400*2)
                            returnData["status"] = "rank";
                        cb(null);
                    }
                });
            }, function(cb) {
                tribute.getUserData(userUid, sTime, function(err,res){
                    if(err)cb(err);
                    else{
                        userData = res;
                        returnData["userData"] = userData;
                        cb(null);
                    }
                });
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "present"://送礼
            if (jutil.postCheck(postData, "heroId", "count") == false) {
                echo("postError");
                return false;
            }
            heroId = postData["heroId"];
            var count = postData["count"] - 0;
            async.series([function(cb){
                tribute.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        sTime = res[0]-0;
                        eTime = res[1]-0;
                        currentConfig = res[2];
                        isAll = parseInt(currentConfig["isAll"]) || 0;
                        if(eTime - jutil.now() <= 86400*2){
                            cb("statusError");
                        } else if(currentConfig["list"][heroId] == undefined){
                            cb("postError");
                        } else {
                            cb(null);
                        }
                    }
                });
            }, function(cb) {
                item.getItem(userUid, currentConfig["present"], function(err,res){
                    if(err)cb(err);
                    else if(res == null || res["number"] - count < 0){
                        cb("itemNotEnough");
                    } else {
                        cb(null);
                    }
                });
            }, function(cb) {
                tribute.getUserData(userUid, sTime, function(err,res){
                    if(err || res == null){
                        cb("dbError");
                    } else {
                        userData = res;
                        userData["data"] -= 0;
                        userData["statusTime"] = eTime;
                        if(userData["arg"][heroId] == undefined){
                            userData["arg"][heroId] = {"num":0, "has":0, "got":0};//num赠送数%10,has可领取礼物数,got已领取礼物数
                        }
                        userData["arg"][heroId]["num"] += count;
                        userData["data"] += count;
                        if(userData["arg"][heroId]["num"] - currentConfig["list"][heroId]["num"] >= 0){
                            userData["arg"][heroId]["has"] += Math.floor(userData["arg"][heroId]["num"]/currentConfig["list"][heroId]["num"]);
                            userData["arg"][heroId]["num"] = userData["arg"][heroId]["num"]%currentConfig["list"][heroId]["num"];
                        }
                        returnData["userData"] = jutil.deepCopy(userData);
                        cb(null);
                    }
                });
            }, function(cb){//扣物品
                item.updateItem(userUid, currentConfig["present"], -count, function(err, res){
                    returnData["itemData"] = res;
                    mongoStats.expendStats(currentConfig["present"], userUid, "127.0.0.1", null, mongoStats.PRACTICE_TRIBUTE_COST, count);
                    cb(err);
                })
           }, function(cb){
                tribute.setUserData(userUid, userData, isAll, cb);
            }],function(err,res){
                echo(err, returnData);
            });
            break;
        case "reward":
            if (jutil.postCheck(postData, "heroId") == false) {
                echo("postError");
                return false;
            }
            heroId = postData["heroId"];
            var heroCount = postData["heroCount"] ? postData["heroCount"] - 0 : 1;
            var reward;
            async.series([function(cb){
                tribute.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        sTime = res[0]-0;
                        eTime = res[1]-0;
                        currentConfig = res[2];
                        isAll = parseInt(currentConfig["isAll"]) || 0;
                        if(currentConfig["list"][heroId] == undefined){
                            cb("postError");
                        } else {
                            reward = currentConfig["list"][heroId]["reward"];
                            cb(null);
                        }
                    }
                });
            }, function(cb) {
                tribute.getUserData(userUid, sTime, function(err,res){
                    if(err)cb(err);
                    else {
                        userData = res;
                        if(userData["arg"][heroId] == undefined || userData["arg"][heroId]["has"] < heroCount){
                            cb("statusError");
                        } else {
                            userData["arg"][heroId]["has"] -= heroCount;
                            userData["arg"][heroId]["got"] += heroCount;
                            returnData["userData"] = jutil.deepCopy(userData);
                            cb(null);
                        }
                    }
                });
            }, function(cb) {
                var list = [];
                for (var j = 0; j < heroCount; j++) {
                    var objSelected = null;
                    var r = Math.random();
                    var pro = 0;
                    for (var i in reward) {
                        pro += reward[i]["pro"] - 0;
                        objSelected = {"id": reward[i]["id"], "count": reward[i]["count"]};
                        if (r <= pro) {
                            break;
                        }
                    }
                    list.push(objSelected);
                }
                returnData["reward"] = list;
                returnData["rewardList"] = [];
                async.eachSeries(returnData["reward"], function (reward, esCb) {
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.PRACTICE_TRIBUTE_GET, reward["count"]);
                    modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                        if (res instanceof Array) {
                            for (var i in res) {
                                returnData["rewardList"].push(res[i]);
                            }
                        } else if (res) {
                            returnData["rewardList"].push(res);
                        }
                        esCb(err);
                    });
                }, cb);
            }, function(cb) {
                tribute.setUserData(userUid, userData, isAll, cb);
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "rankList":
            async.series([function(cb){
                tribute.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        sTime = res[0]-0;
                        eTime = res[1]-0;
                        currentConfig = res[2];
                        returnData["config"] = currentConfig;
                        isAll = parseInt(currentConfig["isAll"]) || 0;
                        returnData["status"] = "present";
                        if(eTime - jutil.now() <= 86400*2)
                            returnData["status"] = "rank";
                        cb(null);
                    }
                });
            }, function(cb) {
                tribute.getUserData(userUid, sTime, function(err,res){
                    if(err)cb(err);
                    else {
                        returnData["userData"] = res;
                        cb(null);
                    }
                });
            }, function(cb) {
                tribute.getRanklist(userUid, isAll, sTime, function(err,res){
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
        case "rankReward":
            async.series([function(cb) {
                tribute.getConfig(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        sTime = res[0]-0;
                        eTime = res[1]-0;
                        currentConfig = res[2];
                        isAll = parseInt(currentConfig["isAll"]) || 0;
                        if(eTime - jutil.now() > 86400*2){
                            cb("statusError");
                        } else {
                            cb(null);
                        }
                    }
                });
            }, function(cb) {
                tribute.getUserData(userUid, sTime, function(err,res){
                    if(err)cb(err);
                    else if(res["status"] == 1){
                        cb("haveReceive");
                    } else {
                        userData = res;
                        userData["status"] = 1;
                        cb(null);
                    }
                });
            }, function(cb) {
                tribute.getRanklist(userUid, isAll, sTime, function(err,res){
                    if(err)cb(err);
                    else {
                        returnData["rank"] = 0;
                        for(var i in res){
                            if(res[i]["userUid"] == userUid)
                                returnData["rank"] = i-0+1;
                        }
                        returnData["reward"] = currentConfig["rank"][returnData["rank"]];
                        if(returnData["reward"] == undefined){
                            cb("noReward");
                        } else {
                            cb(null);
                        }
                    }
                });
            }, function(cb) {
                tribute.setUserData(userUid, userData, isAll, cb);
            }, function(cb) {
                returnData["rewardList"] = [];
                async.eachSeries(returnData["reward"], function(reward, esCb){
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.PRACTICE_TRIBUTE_GET, reward["count"]);
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
            }], function(err, res){
                echo(err, returnData);
            });
            break;
    }
    function echo(err, res){
        if(err){
            response.echo("practice.tribute", jutil.errorInfo(err));
        } else{
            response.echo("practice.tribute",res);
        }
    }
}
exports.start = start;