/**
 * Created by xiazhengxin on 2015/1/22 18:55.
 *
 * 天下第一武道会 战斗回合数据接口
 */

var async = require("async");
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var user = require("../model/user");
var item = require("../model/item");
var hero = require("../model/hero");
var battleModel = require("../model/battle");
var title = require("../model/titleModel");
var achievement = require("../model/achievement");
var globalContestData = require("../model/globalContestData");
var TAG = "pvp.globalContest.battleLog";

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
                cb(null);
            }
        });
    }, function (cb) {
        globalContestData.getBattleRoundData(userUid, isAll, key, logId, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if(userUid == res["he"])
                    battleLog = res;
                else {
                    battleLog["ownTeam"] = res["enemyTeam"];
                    battleLog["enemyTeam"] = res["ownTeam"];
                    battleLog["isWin"] = !res["isWin"];
                    battleLog["reward"] = res["isWin"]?res["reward"]:1;
                    battleLog["roundData"] = [];

                    for(var i = 0; i <  res["roundData"].length && i < 2; i++){
                        for(var j in res["roundData"][i]){
                            res["roundData"][i][j]["isMe"] = !res["roundData"][i][j]["isMe"];
                        }
                    }
                    if(res["roundData"][2] != undefined){
                        res["roundData"][2] = [{"ownSpirit":res["roundData"][2][0]["enemySpirit"], "enemySpirit":res["roundData"][2][0]["ownSpirit"],"isWin":!res["roundData"][2][0]["ownSpirit"]}]
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