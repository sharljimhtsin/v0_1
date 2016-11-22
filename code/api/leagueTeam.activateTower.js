/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 16-06-22
 * Time: 下午14:52
 * 联盟战激活塔 升級塔
 */

var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var league = require("../model/league");
var leagueTeam = require("../model/leagueTeam");
var TAG = "leagueTeam.activateTower";

/***
 *   需求：只有盟主可以激活 3种塔
 * @param postData
 * @param response
 * @param query
 * @returns {boolean}
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData, "type") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var type = postData["type"];//0--资源塔, 1--攻击buff塔, 2--防御buff塔
    var leagueUid = "";
    var sTime = 0;
    var key;
    var tower;
    var towerList;
    var cost;
    var currentConfig;
    var returnData = {};
    var nextCost;
    async.series([function (cb) {
        leagueTeam.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    sTime = res[0];
                    currentConfig = res[2];
                    key = currentConfig["key"];
                    towerList = currentConfig["towerList"];
                    if (sTime >= jutil.now() || sTime + 86400 * 2.5 >= jutil.now() || jutil.now() >= sTime + 86400 * 5.8) {
                        cb("timeNotMatch");
                    } else {
                        cb();
                    }
                } else {
                    cb("configError");
                }
            }
        });
    }, function (cb) {//验证玩家是否已加入联盟
        user.getUser(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res == null || res["leagueUid"] == 0) {
                    cb("noLeague");
                } else {
                    leagueUid = res["leagueUid"];
                    cb();
                }
            }
        });
    }, function (cb) {//验证是否为盟主
        league.getLeague(userUid, leagueUid, function (err, res) {
            if (err) {
                cb(err);
            } else if (res && res["founderUserUid"] == userUid) {
                cb();
            } else {
                cb("notLeader");
            }
        });
    }, function (cb) {
        leagueTeam.getTeamActivated(userUid, leagueUid, type, key, function (err, res) {
            tower = res;
            cb(err);
        });
    }, function (cb) {
        if (tower) {
            var level = parseInt(tower["level"]);
            level++;
            var newTower = towerList[type][level.toString()];
            if (newTower) {
                tower = newTower;
                cost = tower["cost"];
                cb();
            } else {
                cb("topLeveled");
            }
        } else {
            tower = towerList[type]["1"];
            cost = tower["cost"];
            cb();
        }
    }, function (cb) {
        var level = parseInt(tower["level"]);
        level++;
        var newTower = towerList[type][level.toString()];
        if (newTower) {
            nextCost = newTower["cost"];
        } else {
            nextCost = 0;
        }
        returnData["towerCost"] = nextCost;
        cb();
    }, function (cb) {
        leagueTeam.expendContribution(userUid, cost, cb);
    }, function (cb) {
        leagueTeam.getTeamContribution(userUid, leagueUid, key, function (err, res) {
            returnData["contribution"] = res;
            cb(err);
        });
    }, function (cb) {
        leagueTeam.refreshTowerBonus(userUid, leagueUid, key, cb);
    }, function (cb) {
        if (type == 0) {
            tower["lastBonusTime"] = jutil.now();
        }
        leagueTeam.setTeamActivation(userUid, leagueUid, type, tower, key, cb);
    }], function (err) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            returnData["tower"] = tower;
            response.echo(TAG, returnData);
        }
    });
}

exports.start = start;