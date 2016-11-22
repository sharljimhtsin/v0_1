/**
 * Created by xiazhengxin on 2015/3/16 13:38.
 *
 * 极地大乱斗 战斗回合数据
 */

var async = require("async");
var redis = require("../alien/db/redis");
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var mixContestData = require("../model/mixContestData");
var TAG = "pvp.mixContest.battleLog";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "logId") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var logId = postData["logId"];
    var sTime;
    var configData;
    var battleLog = {};
    var isAll;
    var key;
    async.series([function (cb) {
        mixContestData.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else if (jutil.now() < res[0] - 0 + 86400) {
                cb("timeOut");
            } else {
                sTime = res[0] - 0;
                configData = res[2];
                isAll = parseInt(configData["isAll"]) || 0;
                key = configData["key"] || "1";
                cb(null);
            }
        });
    }, function (cb) {
        mixContestData.getBattleRoundData(userUid, isAll, key, logId, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (userUid == res["he"])
                    battleLog = res;
                else {
                    battleLog["ownTeam"] = res["enemyTeam"];
                    battleLog["enemyTeam"] = res["ownTeam"];
                    battleLog["isWin"] = !res["isWin"];
                    battleLog["reward"] = res["isWin"] ? res["reward"] : 1;
                    battleLog["roundData"] = [];

                    for (var i = 0; i < res["roundData"].length && i < 2; i++) {
                        for (var j in res["roundData"][i]) {
                            res["roundData"][i][j]["isMe"] = !res["roundData"][i][j]["isMe"];
                        }
                    }
                    if (res["roundData"][2] != undefined) {
                        res["roundData"][2] = [{
                            "ownSpirit": res["roundData"][2][0]["enemySpirit"],
                            "enemySpirit": res["roundData"][2][0]["ownSpirit"],
                            "isWin": !res["roundData"][2][0]["ownSpirit"]
                        }]
                    }
                    battleLog["roundData"] = res["roundData"];
                }
                cb(null);
            }
        });
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {"battleLog": battleLog});
        }
    });
}

exports.start = start;