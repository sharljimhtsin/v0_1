/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 16-06-22
 * Time: 下午14:52
 * 联盟buff
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var lt = require("../model/leagueTeam");
var formation = require("../model/formation");
var TAG = "leagueTeam.get";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var manorLimit = 0;
    var currentConfig;
    var leagueUid = "";
    var returnData = {};
    var userData = {};
    var key;
    var sTime = 0;
    var towerList;

    async.series([function (cb) {//验证玩家是否已加入联盟
        user.getUser(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res == null || res["leagueUid"] == 0) {
                    cb("noLeague");
                } else {
                    userData = res;
                    leagueUid = userData["leagueUid"];
                    returnData["myLeagueUid"] = leagueUid;
                    cb();
                }
            }
        });
    }, function (cb) {//默认返回领地数据
        lt.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    sTime = res[0];
                    currentConfig = res[2];
                    manorLimit = currentConfig["manorLimit"];
                    key = currentConfig["key"];
                    towerList = currentConfig["towerList"];
                    if (sTime >= jutil.now() || sTime + 86400 * 4.5 >= jutil.now()) {
                        returnData["canBattle"] = false;
                    } else {
                        returnData["canBattle"] = true;
                    }
                    if (sTime >= jutil.now() || sTime + 86400 * 2.5 >= jutil.now() || jutil.now() >= sTime + 86400 * 5.8) {
                        returnData["timeNotMatch"] = false;
                    } else {
                        returnData["timeNotMatch"] = true;
                    }
                    cb();
                } else {
                    cb("configError");
                }
            }
        });
    }, function (cb) {
        lt.checkLeaderJoin(userUid, leagueUid, key, function (err, res) {
            if (err) {
                cb(err);
            } else if (res) {
                returnData["isJoin"] = true;
                cb();
            } else {
                returnData["isJoin"] = false;
                cb();
            }
        });
    }, function (cb) {
        lt.getMemberJoined(userUid, leagueUid, key, function (err, res) {
            returnData["joinList"] = res ? res : {};
            cb(err);
        });
    }, function (cb) {
        lt.getScore(userUid, leagueUid, key, function (err, res) {
            returnData["score"] = res ? res : 0;
            cb(err);
        });
    }, function (cb) {
        lt.getFightingManor(userUid, leagueUid, key, function (err, res) {
            returnData["fighting"] = res ? res : 0;
            cb(err);
        });
    }, function (cb) {
        lt.getTeamActivatedAll(userUid, leagueUid, key, function (err, res) {//类型：0--资源他, 1--攻击buff塔, 2--防御buff塔 状态：0--未激活,1--已激活
            returnData["towerList"] = res ? res : {};
            cb(err);
        });
    }, function (cb) {
        var defaultCost = {
            "0": towerList["0"]["1"]["cost"],
            "1": towerList["1"]["1"]["cost"],
            "2": towerList["2"]["1"]["cost"]
        };
        for (var tower in returnData["towerList"]) {
            var towerObj = returnData["towerList"][tower];
            if (towerObj) {
                var level = parseInt(towerObj["level"]);
                level++;
                var newTower = towerList[tower][level.toString()];
                if (newTower) {
                    defaultCost[tower] = newTower["cost"];
                } else {
                    defaultCost[tower] = 0;
                }
            } else {
                var newTower = towerList[tower]["1"];
                defaultCost[tower] = newTower["cost"];
            }
        }
        returnData["towerCost"] = defaultCost;
        cb();
    }, function (cb) {
        lt.refreshTowerBonus(userUid, leagueUid, key, cb);
    }, function (cb) {
        lt.refreshManorBonusAll(userUid, manorLimit, key, cb);
    }, function (cb) {
        lt.getManors(userUid, manorLimit, key, function (err, res) {
            var tmpList = res ? res : {};
            var manorList = {};
            async.series([function (mCb) {
                mCb(err);
            }, function (mCb) {
                var index = 1;
                var keys = Object.keys(tmpList);
                async.eachSeries(keys, function (key, oneCb) {
                    var manor = tmpList[key];
                    async.series([function (youCb) {
                        if (manor["isRobot"] == 1) {
                            manor["you"] = manor["robotList"];
                            youCb();
                        } else {
                            var tmp = manor["owner"];
                            var playList = [];
                            async.eachSeries(tmp, function (one, eCb) {
                                formation.getUserHeroIds(one["userUid"], function (err, res) {
                                    one["formation"] = res;
                                    playList.push(one);
                                    eCb(err);
                                });
                            }, function (err, res) {
                                manor["you"] = playList;
                                youCb(err);
                            });
                        }
                    }, function (meCb) {
                        var tmp = manor["substitute"][leagueUid] ? manor["substitute"][leagueUid] : [];
                        var playList = [];
                        async.eachSeries(tmp, function (one, eCb) {
                            formation.getUserHeroIds(one["userUid"], function (err, res) {
                                one["formation"] = res;
                                playList.push(one);
                                eCb(err);
                            });
                        }, function (err, res) {
                            manor["me"] = playList;
                            meCb(err);
                        });
                    }, function (dataCb) {
                        manorList[index] = manor;
                        index++;
                        dataCb();
                    }], oneCb);
                }, mCb);
            }, function (mCb) {
                returnData["manorList"] = manorList;
                mCb();
            }], cb);
        });
    }, function (cb) {
        lt.getTeamContribution(userUid, leagueUid, key, function (err, res) {
            returnData["contribution"] = res ? res : 0;
            cb(err);
        });
    }, function (cb) {
        lt.getTeamResource(userUid, leagueUid, key, function (err, res) {
            returnData["resource"] = res ? res : 0;
            cb(err);
        });
    }, function (cb) {
        lt.getRankList(userUid, currentConfig, key, function (err, res) {
            returnData["rankList"] = res ? res : {};
            cb(err);
        });
    }], function (err) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, returnData);
        }
    });
}

exports.start = start;