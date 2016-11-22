/**
 * Created by xiayanxin on 2016/10/25.
 *
 * @deprecated 棄用接口
 */

var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var league = require("../model/league");
var leagueTeam = require("../model/leagueTeam");
var TAG = "leagueTeam.upgradeTower";

/***
 *   需求：只有盟主可以升級 3种塔
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
    var key;
    var tower;
    var towerList;
    var cost;
    async.series([function (cb) {
        leagueTeam.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    key = res[2]["key"];
                    cost = res[2]["towerUpgradeCost"];
                    towerList = res[2]["towerList"];
                    cb();
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
                cb();
            } else {
                cb("top leveled");
            }
        } else {
            cb("not activated");
        }
    }, function (cb) {
        leagueTeam.expendContribution(userUid, cost, cb);
    }, function (cb) {
        leagueTeam.setTeamActivation(userUid, leagueUid, type, tower, key, cb);
    }], function (err) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, tower);
        }
    });
}

exports.start = start;