/**
 * 砸金蛋
 * User: joseppe
 * Date: 15-03-17
 * Time: 下午4:26
 */

var async = require("async");
var smashEgg = require("../model/smashEgg");
var jutil = require("../utils/jutil");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var modelUtil = require("../model/modelUtil");
var redis = require("../alien/db/redis");
var item = require("../model/item");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var returnData = {};
    var currentConfig;
    var chui = 0;
    var count = 0;
    var index = 0;
    var itemId = 154901;
    switch (action) {
        case "chui":
            async.series([function (cb) {
                smashEgg.getConfig(userUid, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        currentConfig = res[2];
                        cb(null);
                    }
                });
            }, function (cb) {
                smashEgg.getUserData(userUid, false, function (err, res) {
                    if (err) {
                        cb(err);
                    } else if (!jutil.compTimeDay(jutil.now(), res["statusTime"])) {
                        cb(null);
                    } else {
                        cb("postError");
                    }
                });
            }, function (cb) {
                smashEgg.setUserData(userUid, {"statusTime": jutil.now()}, cb);
            }, function (cb) {
                mongoStats.dropStats(itemId, userUid, "127.0.0.1", null, mongoStats.PRACTICE_SMASHEGG, currentConfig["chuiNum"]);
                item.updateItem(userUid, itemId, currentConfig["chuiNum"], function (err, res) {
                    if (res != null)
                        chui = res["number"];
                    cb(err, res);
                });
            }], function (err, res) {
                echo(err, {"chui": chui});
            });
            break;
        case "multiSmash":
            if (jutil.postCheck(postData, "count") == false) {
                echo("postError");
                return false;
            }
            var count = postData["count"];
            var eTime = 0;
            async.series([function (cb) {
                item.getItem(userUid, itemId, function (err, res) {
                    if (err) {
                        cb(err);
                    } else if (res == null || res["number"] < count) {
                        cb("chuiNotEnough");
                    } else {
                        returnData["chui"] = res["number"] - 0;
                        cb(null);
                    }
                });
            }, function (cb) {
                item.updateItem(userUid, itemId, -1 * count, cb);
            }, function (cb) {
                smashEgg.getConfig(userUid, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        currentConfig = res[2];
                        eTime = res[1];
                        cb(null);
                    }
                });
            }, function (cb) {
                var rewardTimeLine = eTime - 60 * 60 * 24 * 2;
                var now = jutil.now();
                if (now > rewardTimeLine) {
                    cb("notOpen");
                } else {
                    cb();
                }
            }, function (cb) {
                var rankLine = currentConfig["rankLine"];
                var isAll = currentConfig["isAll"];
                var key = currentConfig["key"];
                smashEgg.addToRank(userUid, count, rankLine, eTime, isAll, key, cb);
            }, function (cb) {
                var itemList = [];
                for (var i = 0; i < count; i++) {
                    var r = Math.random();
                    var p = 0;
                    for (var j in currentConfig["viewAll"]) {
                        p += currentConfig["viewAll"][j]["pro"] - 0;
                        if (r <= p) {
                            itemList.push({
                                "id": currentConfig["viewAll"][j]["id"],
                                "count": currentConfig["viewAll"][j]["count"]
                            });
                            break;
                        }
                    }
                }
                returnData["reward"] = itemList;
                cb();
            }, function (cb) {
                smashEgg.getUserData(userUid, false, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        returnData["credit"] = parseInt(currentConfig["credit"]) * count + res["data"];
                        cb();
                    }
                });
            }, function (cb) {
                smashEgg.setUserData(userUid, {"data": returnData["credit"]}, cb);
            }, function (cb) {
                returnData["rewardList"] = [];
                stats.events(userUid, "127.0.0.1", null, mongoStats.smashEgg1);
                async.eachSeries(returnData["reward"], function (reward, esCb) {
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.smashEgg3, reward["count"]);
                    modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                        if (err) {
                            esCb(err);
                            console.error(reward["id"], reward["count"], reward["isPatch"], reward["level"], err.stack);
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
        case "smash":
            if (jutil.postCheck(postData, "index") == false) {
                echo("postError");
                return false;
            }
            index = postData["index"];
            var rewardList = [];
            var eTime = 0;
            async.series([function (cb) {
                smashEgg.getConfig(userUid, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        returnData["chui"] = chui;
                        currentConfig = res[2];
                        eTime = res[1];
                        cb(null);
                    }
                });
            }, function (cb) {
                var rewardTimeLine = eTime - 60 * 60 * 24 * 2;
                var now = jutil.now();
                if (now > rewardTimeLine) {
                    cb("notOpen");
                } else {
                    cb();
                }
            }, function (cb) {
                item.getItem(userUid, itemId, function (err, res) {
                    if (err) {
                        cb(err);
                    } else if (res == null || res["number"] < 1) {
                        cb("chuiNotEnough");
                    } else {
                        returnData["chui"] = res["number"] - 0;
                        cb(null);
                    }
                });
            }, function (cb) {
                smashEgg.getUserData(userUid, false, function (err, res) {
                    if (err) {
                        cb(err);
                    } else if (!res["arg"].hasOwnProperty(index) || res["arg"][index]["chui"]) {
                        cb("postError");
                    } else {
                        returnData["credit"] = currentConfig["credit"] - 0 + res["data"];
                        returnData["status"] = res["status"] - 0 + 1;
                        var arg = res["arg"];
                        arg[index]["chui"] = true;
                        returnData["gift"] = {"recieve": [], "view": []};
                        for (var i in arg) {
                            returnData["gift"]["recieve"].push(arg[i]["chui"] ? 1 : 0);
                            returnData["gift"]["view"][arg[i]["index"]] = {
                                "id": arg[i]["id"],
                                "count": arg[i]["count"],
                                "recieve": arg[i]["chui"] ? 1 : 0
                            };
                        }
                        returnData["reward"] = [{"id": arg[index]["id"], "count": arg[index]["count"]}];
                        redis.user(userUid).s("smashEgg:arg").setObj(arg, cb);
                    }
                });
            }, function (cb) {
                item.updateItem(userUid, itemId, -1, cb);
            }, function (cb) {
                var rankLine = currentConfig["rankLine"];
                var isAll = currentConfig["isAll"];
                var key = currentConfig["key"];
                smashEgg.addToRank(userUid, 1, rankLine, eTime, isAll, key, cb);
            }, function (cb) {
                smashEgg.setUserData(userUid, {"data": returnData["credit"], "status": returnData["status"]}, cb);
            }, function (cb) {
                returnData["rewardList"] = [];
                stats.events(userUid, "127.0.0.1", null, mongoStats.smashEgg1);
                async.eachSeries(returnData["reward"], function (reward, esCb) {
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.smashEgg3, reward["count"]);
                    modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                        if (err) {
                            esCb(err);
                            console.error(reward["id"], reward["count"], reward["isPatch"], reward["level"], err.stack);
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
        case "rankList":
            var eTime = 0;
            async.series([function (cb) {
                smashEgg.getConfig(userUid, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        currentConfig = res[2];
                        eTime = res[1];
                        cb(null);
                    }
                });
            }, function (cb) {
                var rewardTimeLine = eTime - 60 * 60 * 24 * 2;
                var now = jutil.now();
                if (now < rewardTimeLine) {
                    returnData["rewardTime"] = "notOpen";
                }
                cb();
            }, function (cb) {
                var isAll = currentConfig["isAll"];
                var key = currentConfig["key"];
                smashEgg.getRankList(userUid, isAll, key, currentConfig, function (err, res) {
                    returnData["rankList"] = res;
                    cb(err);
                });
            }, function (cb) {
                smashEgg.getRewardStatus(userUid, currentConfig["key"], function (err, res) {
                    returnData["rankRewardStatus"] = res;
                    cb(err);
                });
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "rankReward":
            var top;
            var reward;
            var rewardList = [];
            var eTime = 0;
            async.series([function (cb) {
                smashEgg.getConfig(userUid, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        currentConfig = res[2];
                        eTime = res[1];
                        cb(null);
                    }
                });
            }, function (cb) {
                var rewardTimeLine = eTime - 60 * 60 * 24 * 2;
                var now = jutil.now();
                if (now >= rewardTimeLine) {
                    cb();
                } else {
                    cb("notOpen");
                }
            }, function (cb) {
                smashEgg.getRewardStatus(userUid, currentConfig["key"], function (err, res) {
                    if (err) {
                        cb(err);
                    } else if (res == false) {
                        cb("got yet");
                    } else {
                        cb();
                    }
                });
            }, function (cb) {
                var isAll = currentConfig["isAll"];
                var key = currentConfig["key"];
                smashEgg.getRank(userUid, isAll, key, function (err, res) {
                    top = res + 1;//top based on 1
                    cb(err);
                });
            }, function (cb) {
                // 獎勵配置格式參考累計充值 BY:運營
                for (var i in currentConfig["rankRewardList"]) {
                    if (top == currentConfig["rankRewardList"][i]["top"]) {
                        reward = currentConfig["rankRewardList"][i]["reward"];
                        break;
                    }
                }
                cb();
            }, function (cb) {
                smashEgg.setRewardStatus(userUid, currentConfig["key"], cb);
            }, function (cb) {
                async.eachSeries(reward, function (item, giveCb) {
                    modelUtil.addDropItemToDB(item["id"], item["count"], userUid, item["isPatch"], item["level"], function (err, res) {
                        if (res instanceof Array) {
                            for (var i in res) {
                                rewardList.push(res[i]);
                            }
                        } else {
                            rewardList.push(res);
                        }
                        giveCb(err);
                    }, null, true);
                }, cb);
            }], function (err, res) {
                returnData["rankReward"] = reward;
                returnData["rewardList"] = rewardList;
                echo(err, returnData);
            });
            break;
        case "exchange":
            if (jutil.postCheck(postData, "index") == false) {
                echo("postError");
                return false;
            }
            var shopItem;
            index = postData["index"];
            count = 1;//postData["count"];
            async.series([function (cb) {
                smashEgg.getConfig(userUid, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        currentConfig = res[2];
                        if (currentConfig["shop"][index] == undefined) {
                            cb("notSold");
                        } else {
                            shopItem = currentConfig["shop"][index];
                            cb(null);
                        }
                    }
                });
            }, function (cb) {
                smashEgg.getUserData(userUid, false, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        returnData["credit"] = res["data"];
                        cb(null);
                    }
                });
            }, function (cb) {
                returnData["credit"] = returnData["credit"] - shopItem["cost"] * count;
                if (returnData["credit"] < 0) {
                    cb("pointNotEnough");
                } else {//兑换
                    smashEgg.setUserData(userUid, {"data": returnData["credit"]}, cb);
                }
            }, function (cb) {
                mongoStats.dropStats(shopItem["id"], userUid, '127.0.0.1', null, mongoStats.smashEgg2, count * shopItem["count"]);
                modelUtil.addDropItemToDB(shopItem["id"], count * shopItem["count"], userUid, false, 1, function (err, res) {
                    returnData["dropItemData"] = res;
                    cb(null);
                });
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "get":
        default :
            if (jutil.postCheck(postData, "refresh") == false) {
                echo("postError");
                return false;
            }
            var refresh = postData["refresh"] == 1 ? true : false;
            var eTime = 0;
            async.series([function (cb) {
                smashEgg.getConfig(userUid, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        currentConfig = res[2];
                        eTime = res[1];
                        returnData["refreshGold"] = currentConfig["refreshGold"];
                        returnData["heroId"] = currentConfig["heroId"];
                        returnData["shop"] = currentConfig["shop"];
                        returnData["addCredit"] = currentConfig["credit"];
                        returnData["gift"] = {"viewAll": currentConfig["viewAll"]};
                        cb(null);
                    }
                });
            }, function (cb) {
                var rewardTimeLine = eTime - 60 * 60 * 24 * 2;
                var now = jutil.now();
                if (now >= rewardTimeLine) {
                    returnData["notOpen"] = true;
                } else {
                    returnData["notOpen"] = false;
                }
                cb();
            }, function (cb) {
                user.getUser(userUid, function (err, res) {
                    if (err || res == null) {
                        cb("dbError");
                    } else {
                        returnData["ingot"] = res["ingot"] - 0;
                        cb(null);
                    }
                });
            }, function (cb) {
                if (refresh && returnData["ingot"] < currentConfig["refreshGold"]) {
                    cb("ingotNotEnough");
                } else if (refresh) {
                    returnData["ingot"] -= currentConfig["refreshGold"] - 0;
                    mongoStats.expendStats("ingot", userUid, '127.0.0.1', null, mongoStats.PRACTICE_SMASHEGG, currentConfig["refreshGold"]);
                    user.updateUser(userUid, {"ingot": returnData["ingot"]}, cb);
                } else {
                    cb(null);
                }
            }, function (cb) {
                smashEgg.getUserData(userUid, refresh, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        returnData["credit"] = res["data"];
                        returnData["free"] = 0;
                        if (!jutil.compTimeDay(jutil.now(), res["statusTime"])) {
                            returnData["free"] = 1;
                        }
                        returnData["chui"] = 0;
                        returnData["gift"]["view"] = [];
                        returnData["gift"]["recieve"] = [];
                        var arg = res["arg"];
                        for (var i in arg) {
                            returnData["gift"]["recieve"].push(arg[i]["chui"] ? 1 : 0);
                            returnData["gift"]["view"][arg[i]["index"]] = {
                                "id": arg[i]["id"],
                                "count": arg[i]["count"],
                                "recieve": arg[i]["chui"] ? 1 : 0
                            };
                        }
                        cb(null);
                    }
                });
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
    }

    function echo(err, res) {
        if (err)
            response.echo("practice.smashEgg", jutil.errorInfo(err));
        else
            response.echo("practice.smashEgg", res);
    }
}

exports.start = start;