/**
 * Created by xiazhengxin on 2016/12/4.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var noble = require("../model/noble");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var formation = require("../model/formation");
var hero = require("../model/hero");
var modelUtil = require("../model/modelUtil");
var configManager = require("../config/configManager");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var TAG = "noble.map.battle";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "mapId") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var mapId = postData["mapId"];
    var configData;
    var mapConfig;
    var battleConfig;
    var lootConfig;
    var timeLimit = 0;
    var force;
    var battleResult = {};
    var mapStatus = {};
    var rewardList = [];
    var userData;
    var updateUser = {};
    var formationList;
    var heroList;
    var returnHero = {};
    var rewardItem = {};
    async.series([function (cb) {
        noble.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = res;
                mapConfig = configData["name"];
                battleConfig = configData["battle"];
                lootConfig = configData["loot"];
                timeLimit = configData["timeLimit"];
                cb();
            }
        });
    }, function (cb) {
        userVariable.getVariable(userUid, "force", function (err, res) {
            force = res;
            cb(force ? err : "forceError");
        });
    }, function (cb) {
        user.getUser(userUid, function (err, res) {
            userData = res;
            cb(err);
        });
    }, function (cb) {
        noble.getMapStatus(userUid, function (err, res) {
            mapStatus = res ? res : mapStatus;
            cb(err);
        });
    }, function (cb) {
        if (mapStatus.hasOwnProperty(mapId)) {
            var mapTimes = mapStatus[mapId];
            if (mapTimes["times"] >= timeLimit && jutil.compTimeDay(jutil.now(), mapTimes["time"])) {
                cb("timeOver");
            } else {
                cb();
            }
        } else {
            cb();
        }
    }, function (cb) {
        userVariable.incrPveCount(userUid);
        if (userData == null) {
            cb("noThisUser");
        } else if (userData["pvePower"] < 1) {//pve体力不足
            var newPowerTime = configManager.createConfig(userUid).getPvePower(userData["pvePower"], userData["lastRecoverPvePower"], jutil.now());
            if ((newPowerTime[0] - 0) >= 1) {
                cb();
            } else {
                cb("physicalShortagePVE");
            }
        } else {
            cb();
        }
    }, function (cb) {
        if (mapConfig.hasOwnProperty(mapId)) {
            var robotForce = battleConfig[mapId];
            battleResult["robotName"] = mapConfig[mapId];
            battleResult["robotForce"] = robotForce;
            var configData = configManager.createConfig(userData["userUid"]);
            var playerConfig = configData.getConfig("player");
            var getExpPlayer = parseInt(playerConfig[userData["lv"]]["getPlayerExp"]);
            rewardItem["addExpPlayer"] = getExpPlayer;
            var addExpHero = parseInt(playerConfig[userData["lv"]]["getHeroExp"]);
            rewardItem["addExpHero"] = addExpHero;
            updateUser["exp"] = parseInt(userData["exp"]) + getExpPlayer;
            // cost pve power
            var newPower = configManager.createConfig(userUid).getPvePower(userData["pvePower"] - 0, userData["lastRecoverPvePower"] - 0, jutil.now());
            var lastPower = newPower[0];
            updateUser["lastRecoverPvePower"] = newPower[1];
            updateUser["pvePower"] = lastPower - 1;
            if (force > robotForce) {
                battleResult["isWin"] = true;
                async.series([function (dropCb) {
                    // drop item
                    var rewards = lootConfig.hasOwnProperty(mapId) ? lootConfig[mapId] : [];
                    rewardItem["rewards"] = rewards;
                    async.eachSeries(rewards, function (reward, giveCb) {
                        modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, 0, 1, function (err, res) {
                            if (res instanceof Array) {
                                for (var i in res) {
                                    rewardList.push(res[i]);
                                }
                            } else if (res) {
                                rewardList.push(res);
                            }
                            switch (reward["id"]) {
                                case "gold":
                                    mongoStats.expendStats(reward["id"], userUid, "127.0.0.1", userData, mongoStats.NOBLE3, reward["count"]);
                                    break;
                                default:
                                    mongoStats.expendStats(reward["id"], userUid, "127.0.0.1", userData, mongoStats.NOBLE4, reward["count"]);
                                    break;
                            }
                            giveCb(err);
                        });
                    }, dropCb);
                }, function (expCb) {
                    switch (mapId) {
                        case "300001":
                            stats.events(userUid, "127.0.0.1", userData, mongoStats.NOBLE6);
                            break;
                        case "300002":
                            stats.events(userUid, "127.0.0.1", userData, mongoStats.NOBLE7);
                            break;
                        case "300003":
                            stats.events(userUid, "127.0.0.1", userData, mongoStats.NOBLE8);
                            break;
                        case "300004":
                            stats.events(userUid, "127.0.0.1", userData, mongoStats.NOBLE9);
                            break;
                        case "300005":
                            stats.events(userUid, "127.0.0.1", userData, mongoStats.NOBLE10);
                            break;
                        default:
                            break;
                    }
                    user.updateUser(userUid, updateUser, expCb);
                }, function (heroExpCb) {
                    formation.getUserFormation(userUid, function (err, res) {
                        formationList = res;
                        heroExpCb(err);
                    });
                }, function (heroExpCb) {
                    hero.getHero(userUid, function (err, res) {
                        heroList = res;
                        heroExpCb(err);
                    });
                }, function (heroExpCb) {
                    var arr = [];
                    for (var key in formationList) {
                        var formationItem = formationList[key];
                        var heroUid = formationItem["heroUid"];
                        var heroItem = heroList[heroUid];
                        var maxExp = configData.heroMaxExp(heroItem["heroId"], userData["lv"]);
                        heroItem["exp"] = parseInt(heroItem["exp"]) + addExpHero;
                        heroItem["level"] = configData.heroExpToLevel(heroItem["heroId"], heroItem["exp"]) - 0;
                        if (heroItem["exp"] > maxExp) {
                            heroItem["exp"] = maxExp;
                            heroItem["level"] = configData.heroExpToLevel(heroItem["heroId"], maxExp);
                        }
                        returnHero[key] = {};
                        returnHero[key]["heroUid"] = heroUid;
                        returnHero[key]["exp"] = heroItem["exp"];
                        arr.push(heroItem);
                    }
                    async.eachSeries(Object.keys(arr), function (key, esCb) {
                        var item = arr[key];
                        hero.updateHero(userData["userUid"], item["heroUid"], item, esCb);
                    }, heroExpCb);
                }], cb);
            } else {
                // add exp
                battleResult["isWin"] = false;
                user.updateUser(userUid, updateUser, cb);
            }
        } else {
            cb("mapError");
        }
    }, function (cb) {
        if (mapStatus.hasOwnProperty(mapId)) {
            var mapTimes = mapStatus[mapId];
            if (jutil.compTimeDay(jutil.now(), mapTimes["time"])) {
                mapTimes["times"] = parseInt(mapTimes["times"]) + 1;
            } else {
                mapTimes["times"] = 1;
                mapTimes["time"] = jutil.now();
            }
            mapStatus[mapId] = mapTimes;
        } else {
            mapStatus[mapId] = {"times": 1, "time": jutil.now()};
        }
        noble.setMapStatus(userUid, mapStatus, cb);
    }], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, {
                "battleResult": battleResult,
                "rewardList": rewardList,
                "heroGetExp": returnHero,
                "updateUser": updateUser,
                "rewardItem": rewardItem
            });
        }
    });
}

exports.start = start;