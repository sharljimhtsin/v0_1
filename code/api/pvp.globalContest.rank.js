/**
 * Created by xiazhengxin on 2015/2/3 15:04.
 *
 * 天下第一武道会 排行榜接口
 */

var async = require("async");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var globalContestData = require("../model/globalContestData");
var bitUtil = require("../alien/db/bitUtil");
var user = require("../model/user");
var formation = require("../model/formation");
var TAG = "pvp.globalContest.rank";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var stageType;
    var configData;
    var sTime;
    var vsList = [];
    var top10 = [];
    var isAll;
    var key;
    var round = 1;
    async.series([
        function (cb) {
            globalContestData.getConfig(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else if (jutil.now() < res[0] - 0 + 86400) {
                    cb("timeOut");
                } else {
                    sTime = res[0] - 0;
                    configData = res[2];
                    isAll = parseInt(configData["isAll"]) || 0;
                    key = configData["key"] || "1";
                    stageType = configData["stageType"];
                    for (; round < 3; round++)
                        if (jutil.now() < sTime + 86400 * (round + 1))break;
                    cb(null);
                }
            });
        },
        function (cb) {// 当前用户排行
            globalContestData.getAllBattleList(userUid, isAll, key, function (err, res) {
                if (err) {
                    cb(err);
                } else if (res == null) {
                    cb(null);
                } else {
                    getVSList(res, round, function (err, res) {
                        if (err) {
                            cb(err);
                        } else {
                            vsList = res;
                            cb(null);
                        }
                    });
                }
            });
        },
        function (cb) {// 排行榜
            globalContestData.getTop10(userUid, isAll, key, function (err, res) {
                if (err) cb(err);
                else {
                    top10 = res;
                    var top10New = [];
                    async.eachSeries(top10, function (uid, esCb) {
                        user.getUser(uid, function (err, res) {
                            if (err || res == null) {
                                esCb("err");
                            } else {
                                var mCode = bitUtil.parseUserUid(res["userUid"]);
                                if (mCode[0] == "r") {
                                    mCode[0] = "S";
                                }
                                var userData = {"name": res["userName"], "server": mCode[0] + mCode[1]};
                                formation.getUserHeroId(res["userUid"], function (err, res) {
                                    if (err) {
                                        esCb(err);
                                    } else {
                                        userData["heroId"] = res;
                                        top10New.push(userData);
                                        esCb();
                                    }
                                });
                            }
                        });
                    }, function (err, res) {
                        if (err) {
                            cb(err);
                        } else {
                            top10 = top10New;
                            cb();
                        }
                    });
                }
            });
        }
    ], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {
                "round": round,
                "vsList": vsList,
                "list": top10
            });
        }
    });
}


function getVSList(allBattleList, round, callbackFn) {
    var vsList = [];
    async.eachSeries(Object.keys(allBattleList), function (battleId, esCb) {
        var vs = {};
        var user1 = {};
        var user2 = {};
        var battle;
        try {
            battle = JSON.parse(allBattleList[battleId]);
        } catch (e) {
            esCb(null);
            return;
        }
        if ((battle["stage"] > 8 && round == 3) || (battle["stage"] != 8 && round == 2) || round == 1) {
            esCb(null);
            return;
        }
        async.series([function (cb) {
            user.getUser(battle["winner"], function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    user1["name"] = res["userName"];
                    var mCode = bitUtil.parseUserUid(battle["winner"]);
                    user1["server"] = mCode[1];
                    cb(null);
                }
            });
        }, function (cb) {
            formation.getUserHeroId(battle["winner"], function (err, res) {
                user1["heroId"] = res;
                cb(err);
            })
        }, function (cb) {
            user.getUser(battle["loser"], function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    user2["name"] = res["userName"];
                    var mCode = bitUtil.parseUserUid(battle["loser"]);
                    user2["server"] = mCode[1];
                    cb(null);
                }
            });
        }, function (cb) {
            formation.getUserHeroId(battle["loser"], function (err, res) {
                user2["heroId"] = res;
                cb(err);
            })
        }], function (err, res) {
            if (err) {
                esCb(err);
            } else {
                vs["user1"] = user1;
                vs["user2"] = user2;
                vsList.push(vs);
                esCb();
            }
        });
    }, function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            callbackFn(null, vsList);
        }
    });
}
exports.start = start;