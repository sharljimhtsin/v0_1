/**
 * Created by xiazhengxin on 2015/3/16 13:38.
 *
 * 极地大乱斗 战斗列表
 */

var async = require("async");
var redis = require("../alien/db/redis");
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var user = require("../model/user");
var mixContestData = require("../model/mixContestData");
var formation = require("../model/formation");
var TAG = "pvp.mixContest.battleList";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var userData = {"isSelf": 1, "isWin": 1};
    var sTime;
    var battleList = [];
    var ret = [];
    var key = "1";
    var isAll = 0;
    var round = 1;
    async.series([function (cb) {
        mixContestData.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else if (jutil.now() < res[0] - 0 + 86400) {
                cb("timeOut");
            } else {
                sTime = res[0] - 0;
                for (; round < 3; round++)
                    if (jutil.now() < sTime + 86400 * (round + 1))break;
                isAll = parseInt(res[2]["isAll"]) || 0;
                key = res[2]["key"] || "1";
                cb(null);
            }
        });
    }, function (cb) {
        mixContestData.getBattleList(userUid, isAll, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                for (var i in res) {
                    try {
                        battleList[i] = JSON.parse(res[i]);
                    } catch (e) {
                    }
                }
                cb(null);
            }
        });
    }, function (cb) {
        userData["server"] = mixContestData.getServerNameByUserUid(userUid);
        user.getUser(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                userData["name"] = res["userName"];
                cb(null);
            }
        });
    }, function (cb) {
        formation.getUserHeroId(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                userData["heroId"] = res;
                cb(null);
            }
        });
    }, function (cb) {
        async.eachSeries(Object.keys(battleList), function (battleId, esCb) {
            var battleData = battleList[battleId];
            var isWin = battleData["winner"] == userUid;
            var oUserUid = isWin ? battleData["loser"] : battleData["winner"];
            user.getUser(oUserUid, function (err, res) {
                var otherUser = {
                    "name": res["userName"],
                    "isSelf": 0,
                    "server": mixContestData.getServerNameByUserUid(oUserUid),
                    "isWin": 0
                }
                var item = {
                    "stage": battleData["stage"],
                    "round": 1,
                    "logId": battleId,
                    "score": battleData["score"]
                }
                if (battleData["stage"] >= 16)
                    item["round"] = 1;
                else if (battleData["stage"] == 8) {
                    item["round"] = 2;
                } else {
                    item["round"] = 3;
                }

                if (isWin) {
                    userData["isWin"] = 1;
                    otherUser["isWin"] = 0;
                    item["user1"] = jutil.copyObject(userData);
                    item["user2"] = otherUser;
                    item["score"] = battleData["score"];
                } else {
                    userData["isWin"] = 0;
                    otherUser["isWin"] = 1;
                    item["user1"] = otherUser;
                    item["user2"] = jutil.copyObject(userData);
                    item["score"] = 1;
                }
                ret.push(item);
                formation.getUserHeroId(userUid, function (err, res) {
                    if (err) {
                        esCb(err);
                    } else {
                        otherUser["heroId"] = res;
                        esCb(null);
                    }
                });
            })
        }, cb);
    }, function (cb) {
        ret.sort(function (x, y) {
            return x["stage"] > y["stage"];
        });
        cb(null);
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {"battleList": ret, "round": round});
        }
    });
}

exports.start = start;