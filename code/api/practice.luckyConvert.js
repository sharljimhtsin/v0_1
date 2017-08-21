/**
 * 幸福兑换活动的接口--luckyConvert
 * User: za
 * Date: 15-9-1
 * Time: 下午20:20
 */
var jutil = require("../utils/jutil");
var async = require("async");
var luckyConvert = require("../model/practiceLuckyConvert");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var item = require("../model/item");
var fs = require('fs');

function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var currentConfig;
    var sTime = 0;
    var eTime = 0;
    var returnData = {};//返回集合
    var userData = {};//用户数据
    var fireList = [];//抽奖列表
    var ingot = 0;//用户的伊美加币个数
    var gold = 0;//用户的索尼个数
    var userPoint = 0;//用户兑换券个数
    var shopList = [];//商城列表
    var shopListFirst = [];//商城列表第一个格子
    var mCount = 0;//抽奖的次数
    var list = [];//奖励列表
    var shopItem = [];//奖励列表中的单个奖励
    var refreshIngot = 0;//金币消耗数
    var convertTimes = 0;//兑换次数
    switch (action) {
        case "get"://取数据
        default:
            async.series([function (cb) {// 取配置
                luckyConvert.getConfig(userUid, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        sTime = res[0] - 0;
                        eTime = res[1] - 0;
                        currentConfig = res[2];
                        returnData["sTime"] = sTime;
                        returnData["eTime"] = eTime;
                        returnData["config"] = currentConfig;
                        cb();
                    }
                });
            }, function (cb) {
                luckyConvert.getUserData(userUid, sTime, false, function (err, res) {//取用户数据
                    if (err || res["arg"] == null || res["arg"]["shopList"] == undefined) {
                        cb("dbError");
                    } else {
                        userData = res;
                        returnData["convertTimes"] = userData["arg"]["convertTimes"];
                        returnData["shopList"] = userData["arg"]["shopList"];
                        returnData["shopListFirst"] = userData["arg"]["shopListFirst"];
                        cb();
                    }
                });
            }, function (cb) {//更新数据
                luckyConvert.setUserData(userUid, userData, cb);
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "fire"://抽奖：///******************************************把兑换券放回10个奖励里（sh）
            if (jutil.postCheck(postData, "type") == false) {
                echo("postError");
                return false;
            }
            var type = postData["type"];//档位
            async.series([function (cb) {// 获取活动配置数据
                luckyConvert.getConfig(userUid, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        sTime = res[0];
                        eTime = res[1];
                        currentConfig = res[2];
                        fireList = currentConfig["fireList"];
                        cb();
                    }
                });
            }, function (cb) {//取用户数据
                luckyConvert.getUserData(userUid, sTime, false, function (err, res) {
                    if (err || res["arg"] == null || res["arg"]["shopList"] == undefined) {
                        cb("dbError");
                    } else {
                        userData = res;
                        var error = null;
                        switch (type) {
                            case "2"://10次
                                ingot = currentConfig["tenPay"] - 0;
                                mCount = 10;
                                stats.events(userUid, "127.0.0.1", null, mongoStats.P_LUCKYCONVERT2);//幸运兑换十次使用次数统计
                                break;
                            case "1"://1次
                                ingot = currentConfig["singlePay"] - 0;
                                mCount = 1;
                                stats.events(userUid, "127.0.0.1", null, mongoStats.P_LUCKYCONVERT1);//幸运兑换单次使用次数统计
                                break;
                            default :
                                error = "typeError";
                                break;
                        }
                        userData["arg"]["ingot"] += ingot;
                        userData["arg"]["mCount"] += mCount;
                        userPoint = userData["arg"]["point"] - 0;
                        cb(error);
                    }
                });
            }, function (cb) {//扣钱
                user.getUser(userUid, function (err, res) {
                    if (err || res == null) {
                        cb("dbError");
                    } else if (res["ingot"] - ingot < 0) {
                        cb("ingotNotEnough");
                    } else if (ingot == 0) {
                        cb();
                    } else {
                        returnData["userData"] = {"ingot": res["ingot"] - ingot};
                        var msg = {"ingot": ingot, "userUid": userUid, "time": jutil.now()};
                        fs.appendFile('lucky.log', JSON.stringify(msg) + "\n", 'utf8');
                        mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.P_LUCKYCONVERT4, ingot);//幸运兑换伊美加币消耗统计
                        user.updateUser(userUid, returnData["userData"], cb);
                    }
                });
            }, function (cb) {//设置数据
                var list = [];
                while (list.length < mCount) {//需求：1,10,100
                    var randomRate = Math.random();
                    var p = 0;
                    for (var i in fireList) {
                        p += fireList[i]["prob"] - 0;
                        if (randomRate <= p) {
                            list.push({"id": fireList[i]["id"], "count": fireList[i]["count"]});
                            break;
                        }
                    }
                }
                returnData["reward"] = list;
                userPoint++;
                userData["arg"]["point"] = userPoint - 0;
                returnData["point"] = userData["arg"]["point"];//道具个数
                luckyConvert.setUserData(userUid, userData, cb);
            }, function (cb) {//进背包
                returnData["rewardList"] = [];
                var msg = {"reward": returnData["reward"], "userUid": userUid, "time": jutil.now()};
                fs.appendFile('lucky.log', JSON.stringify(msg) + "\n", 'utf8');
                async.eachSeries(returnData["reward"], function (reward, esCb) {
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.P_LUCKYCONVERT6, reward["count"]);//幸运兑换道具掉落统计
                    modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                        if (err) {
                            esCb(err);
                        } else {
                            if (res instanceof Array) {
                                for (var i in res) {
                                    returnData["rewardList"].push(res[i]);
                                }
                            } else {
                                returnData["rewardList"].push(res);
                            }
                            esCb();
                        }
                    });
                }, cb);
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "convert"://兑换：//**********************************改为1次性兑换 必须重置（已改）
            if (jutil.postCheck(postData, "index") == false) {
                echo("postError");
                return false;
            }
            var index = postData["index"];//商城列表（数组下标）
            async.series([function (cb) {//取用户配置
                luckyConvert.getConfig(userUid, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        sTime = res[0] - 0;
                        eTime = res[1] - 0;
                        currentConfig = res[2];
                        cb();
                    }
                });
            }, function (cb) {//取用户数据
                luckyConvert.getUserData(userUid, sTime, false, function (err, res) {
                    if (err || res["arg"] == null || res["arg"]["shopList"] == undefined) {
                        cb("dbError");
                    } else {
                        userData = res;
                        shopList = userData["arg"]["shopList"];
                        userPoint = userData["arg"]["point"] - 0;//道具个数
                        ingot = userData["arg"]["ingot"];
                        gold = userData["arg"]["gold"];
                        convertTimes = userData["arg"]["convertTimes"] - 0;//兑换奖励的次数（商城列表第一格）
                        shopListFirst = userData["arg"]["shopListFirst"];
                        if (index == -1) {//第一个格子
                            if (shopListFirst[0] == undefined) {
                                cb("dbError");
                            } else {
                                if (convertTimes - 1 < 0) {//验证次数
                                    cb("notSold");//兑换次数不足
                                } else {
                                    shopItem = shopListFirst[0];
                                    userData["arg"]["convertTimes"]--;
                                    returnData["convertTimes"] = userData["arg"]["convertTimes"];
                                }
                            }
                        } else {//后七个格子
                            if (shopList[index] == undefined || index > shopList.length || shopList[index]["status"] == 1) {//增加一个兑换状态（1次性兑换）
                                cb("notSold");//没有出售
                            } else {
                                shopItem = shopList[index];
                            }
                        }
                        //兑换（3种兑换方式），1.伊美加币 2.索尼 3.兑换券
                        if (shopItem["type"] == "ingot") {//使用伊美加币兑换奖励
                            user.getUser(userUid, function (err, res) {
                                if (err || res == null) {
                                    cb("dbError");
                                } else if (res["ingot"] - shopItem["cost"] < 0) {
                                    cb("ingotNotEnough");
                                } else {
                                    shopItem["status"] = 1;
                                    userData["arg"]["shopList"][index]["status"] = shopItem["status"];
                                    userData["arg"]["point"] = userPoint - 0;
                                    userData["arg"]["ingot"] = ingot + shopItem["cost"];
                                    returnData["userData"] = {"ingot": res["ingot"] - shopItem["cost"]};
                                    mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.P_LUCKYCONVERT4, shopItem["cost"]);//幸运兑换伊美加币消耗统计
                                    user.updateUser(userUid, returnData["userData"], cb);
                                }
                            });
                        } else if (shopItem["type"] == "gold") {//使用索尼兑换奖励
                            user.getUser(userUid, function (err, res) {
                                if (err || res == null) {
                                    cb("dbError");
                                } else if (res["gold"] - shopItem["cost"] < 0) {
                                    cb("ingotNotEnough");
                                } else {
                                    shopItem["status"] = 1;
                                    userData["arg"]["shopList"][index]["status"] = shopItem["status"];
                                    userData["arg"]["point"] = userPoint - 0;
                                    userData["arg"]["gold"] = gold + shopItem["cost"];
                                    returnData["userData"] = {"gold": res["gold"] - shopItem["cost"]};
                                    mongoStats.expendStats("gold", userUid, "127.0.0.1", null, mongoStats.P_LUCKYCONVERT5, shopItem["cost"]);//幸运兑换索尼消耗统计
                                    user.updateUser(userUid, returnData["userData"], cb);
                                }
                            });
                        } else if (shopItem["type"] == "0") {//使用兑换券兑换奖励
                            var itemId = "153642";
                            item.getItem(userUid, itemId, function (err, res) {
                                if (err || res == null) {
                                    cb("dbError");//+"3"
                                } else if (res["number"] - shopItem["cost"] < 0) {
                                    cb("noItem");
                                } else {
                                    if (index != -1) {
                                        userData["arg"]["shopList"][index]["status"] = 1;
                                    }
                                    userData["arg"]["point"] = res["number"] - shopItem["cost"];
                                    returnData["userData"] = {"0": userData["arg"]["point"]};
                                    mongoStats.expendStats(itemId, userUid, "127.0.0.1", null, mongoStats.P_LUCKYCONVERT7, shopItem["cost"]);//幸运兑换券消耗数量统计
                                    item.updateItem(userUid, itemId, -shopItem["cost"], cb);
                                }
                            });
                        } else {//后台配置出错或者没有接收到数据
                            cb("dbError");
                        }
                    }
                });
            }, function (cb) {
                luckyConvert.setUserData(userUid, userData, cb);
            }, function (cb) {//更新数据
                list.push({"id": shopItem["id"], "count": shopItem["count"]});
                returnData["reward"] = list;
                cb(null);
            }, function (cb) {//进背包
                returnData["rewardList"] = [];
                async.eachSeries(returnData["reward"], function (reward, esCb) {
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.P_LUCKYCONVERT6, reward["count"]);//幸运兑换道具掉落统计
                    modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                        if (err) {
                            esCb(err);
                        } else {
                            if (res instanceof Array) {
                                for (var i in res) {
                                    returnData["rewardList"].push(res[i]);
                                }
                            } else {
                                returnData["rewardList"].push(res);
                            }
                            esCb();
                        }
                    });
                }, cb);
            }], function (err, res) {
                echo(err, returnData);//金币，次数，奖励集合，cd时间
            });
            break;
        case "shopList"://刷新：1.自动，2.手动
            if (jutil.postCheck(postData, "kind") == false) {
                echo("postError");
                return false;
            }
            var kind = postData["kind"] - 0;//1--点击刷新按钮（主动）
            async.series([function (cb) {//取配置
                luckyConvert.getConfig(userUid, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        sTime = res[0] - 0;
                        eTime = res[1] - 0;
                        currentConfig = res[2];
                        refreshIngot = currentConfig["refreshIngot"];
                        shopListFirst = currentConfig["shopListFirst"];
                        shopList = currentConfig["shopList"];
                        cb();
                    }
                });
            }, function (cb) {//取用户数据
                luckyConvert.getUserData(userUid, sTime, false, function (err, res) {
                    if (err || res["arg"] == null || res["arg"]["shopList"] == undefined) {
                        cb("dbError");
                    } else {
                        userData = res;
                        if (kind == 1) {//手动刷新
                            while (list.length < 7) {//需求：1,10,100
                                var randomRate = Math.random();
                                var p = 0;
                                for (var i in shopList) {
                                    p += shopList[i]["prob"] - 0;
                                    if (randomRate <= p) {
                                        list.push({
                                            "id": shopList[i]["id"],
                                            "count": shopList[i]["count"],
                                            "type": shopList[i]["type"],
                                            "cost": shopList[i]["cost"]
                                        });
                                        break;
                                    }
                                }
                            }
                            userData["arg"]["shopList"] = list;
                            userData["arg"]["shopListFirst"] = shopListFirst;
                            returnData["shopList"] = userData["arg"]["shopList"];
                            returnData["shopListFirst"] = userData["arg"]["shopListFirst"];
                            returnData["upDateTime"] = userData["arg"]["upDateTime"];
                            stats.events(userUid, "127.0.0.1", null, mongoStats.P_LUCKYCONVERT3);//幸运兑换手动刷新次数统计
                            user.getUser(userUid, function (err, res) {
                                if (err || res == null) {
                                    cb("dbError");
                                } else if (res["ingot"] - refreshIngot < 0) {
                                    cb("ingotNotEnough");
                                } else if (refreshIngot == 0) {
                                    cb();
                                } else {
                                    userData["arg"]["ingot"] += refreshIngot;
                                    returnData["userData"] = {"ingot": res["ingot"] - refreshIngot};
                                    mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.P_LUCKYCONVERT4, refreshIngot);//幸运兑换伊美加币消耗统计
                                    user.updateUser(userUid, returnData["userData"], cb);
                                }
                            });
                        } else if (kind == 0) {
                            returnData["shopList"] = userData["arg"]["shopList"];
                            returnData["shopListFirst"] = userData["arg"]["shopListFirst"];
                            returnData["upDateTime"] = userData["arg"]["upDateTime"];
                            cb();
                        } else {
                            cb();
                        }
                    }
                });
            }, function (cb) {
                luckyConvert.setUserData(userUid, userData, cb);
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
    }
    function echo(err, res) {
        if (err) {
            response.echo("practice.luckyConvert", jutil.errorInfo(err));
        } else {
            response.echo("practice.luckyConvert", res);
        }
    }
}
exports.start = start;