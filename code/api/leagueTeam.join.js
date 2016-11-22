/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 16-06-22
 * Time: 下午14:52
 * 联盟战 会长报名
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var lt = require("../model/leagueTeam");
var forgeData = require("../model/forgeData");
var TAG = "leagueTeam.join";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var leagueUid = "";
    var sTime = 0;
    var members = [];
    var key;
    var cost = [];

    async.series([function (cb) {
        lt.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    sTime = res[0];
                    key = res[2]["key"];
                    cost = res[2]["leaderCost"];
                    if (sTime >= jutil.now() || sTime + 86400 * 2.5 <= jutil.now() || jutil.now() >= sTime + 86400 * 5.8) {
                        cb("timeNotMatch");
                    } else {
                        cb();
                    }
                } else {
                    cb("configError");
                }
            }
        });
    }, function (cb) {
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
    }, function (cb) {
        async.eachSeries(cost, function (item, eCb) {
            forgeData.expendItem(userUid, item["id"], item["type"], item["count"], eCb);
        }, cb);
    }, function (cb) {
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
        lt.checkLeaderJoin(userUid, leagueUid, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res) {
                    cb("alreadyJoin");
                } else {
                    cb();
                }
            }
        });
    }, function (cb) {
        lt.leaderJoin(userUid, leagueUid, key, cb);
    }, function (cb) {
        lt.getLeaderJoined(userUid, key, function (err, res) {
            members = res;
            cb(err);
        });
    }], function (err) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, members);
        }
    });
}

exports.start = start;