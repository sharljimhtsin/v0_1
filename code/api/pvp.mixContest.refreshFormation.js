/**
 * Created by xiazhengxin on 2015/3/16 13:37.
 *
 * 极地大乱斗 刷新阵型
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var mixContestData = require("../model/mixContestData");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var TAG = "pvp.mixContest.refreshFormation";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "type") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var type = postData["type"];
    var sTime = 0;
    var isAll;
    var key;
    var formationList;
    var freeRefresh;
    var heroSource;
    var userIngot;
    var refreshCost;
    var lockCount = 0;
    var list;
    async.series([function (cb) {
        mixContestData.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else if (jutil.now() > res[0] - 0 + 86400) {
                cb("timeOut");
            } else {
                sTime = res[0] - 0;
                isAll = parseInt(res[2]["isAll"]) || 0;
                key = res[2]["key"] || "1";
                heroSource = res[2]["hero"] || [];
                refreshCost = res[2]["refreshCost"];
                cb(null);
            }
        });
    }, function (cb) {
        mixContestData.getFormation(userUid, isAll, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                formationList = res;
                cb();
            }
        });
    }, function (cb) {
        async.series([function (innerCb) {
            if (type == 0) {
                mixContestData.checkFreeRefreshUsed(userUid, isAll, key, function (err, res) {
                    if (err || res == 0) {
                        freeRefresh = 0;
                    } else {
                        freeRefresh = 1;
                    }
                    innerCb();
                });
            } else {
                freeRefresh = 0;
                innerCb();
            }
        }, function (innerCb) {
            if (type == 0 && freeRefresh == 0) {
                innerCb();
            } else {
                var heroList = jutil.deepCopy(heroSource);
                // 随机顺序
                heroList.sort(function () {
                    return 0.5 - Math.random();
                });
                var tenHeroList = [];
                do {
                    for (var i in heroList) {
                        var h = heroList[i];
                        var compareRate = h["prob"] - 0;
                        var randomRate = Math.random();
                        if (randomRate <= compareRate) {
                            if (tenHeroList.indexOf(h) == -1) {
                                tenHeroList.push(h);
                            }
                        }
                    }
                } while (tenHeroList.length < 10);
                async.series([function (tinyCb) {
                    mixContestData.saveFormation(userUid, isAll, key, tenHeroList, formationList, false, tinyCb);
                }, function (tinyCb) {
                    mixContestData.recordFreeRefresh(userUid, isAll, key, tinyCb);
                }], function (err, res) {
                    innerCb(err);
                });
            }
        }], function (err, res) {
            cb(err);
        });
    }, function (cb) {
        mixContestData.getFormation(userUid, isAll, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                formationList = res;
                cb();
            }
        });
    }, function (cb) {
        for (var i in formationList) {
            if (formationList[i]["status"] == "lock") {
                lockCount++;
            }
        }
        var cost = refreshCost[lockCount + ""];
        if (type == 1) {
            if (lockCount == 0) {
                stats.events(userUid, "127.0.0.1", null, mongoStats.mixContest5);
            } else {
                stats.recordWithLevelIndex(lockCount, [mongoStats.mixContest6, mongoStats.mixContest7, mongoStats.mixContest8, mongoStats.mixContest9], function (tag) {
                    stats.events(userUid, "127.0.0.1", null, tag);
                });
            }
            user.getUser(userUid, function (err, res) {
                if (err) cb(err);
                else {
                    var resultUserIngot = res["ingot"] - 0 - cost;
                    if (resultUserIngot < 0) cb("ingotNotEnough");
                    else {
                        var newIngot = {"ingot": resultUserIngot};
                        user.updateUser(userUid, newIngot, function (err, res) {
                            mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.MIXCONTEST_REFRESH, cost);
                            cb(err);
                        });
                    }
                }
            });
        } else {
            cb();
        }
    }, function (cb) {
        user.getUser(userUid, function (err, res) {
            if (err) cb(err);
            else {
                userIngot = res["ingot"];
                cb();
            }
        });
    }, function (cb) {
        mixContestData.getFreeRefresh(userUid, isAll, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                freeRefresh = res;
                cb();
            }
        });
    }, function (cb) {
        mixContestData.getBattleNeedData(userUid, isAll, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                list = res;
                list["hero"] = list["heroList"];
                list["formation"] = list["formationList"];
                list["equip"] = list["equipList"];
                list["skill"] = list["skillList"];
                list["gravity"] = list["gravityList"];
                delete list["heroList"];
                delete list["formationList"];
                delete list["equipList"];
                delete list["skillList"];
                delete list["gravityList"];
                cb();
            }
        });
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {
                "list": list,
                "userIngot": {"ingot": userIngot},
                "refreshTimes": freeRefresh,
                "lockCost": refreshCost[lockCount + ""],
                "refreshCost": refreshCost[0 + ""]
            });
        }
    });
}

exports.start = start;