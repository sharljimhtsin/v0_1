/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 16-06-22
 * Time: 下午14:52
 * 联盟战 排行榜
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var lt = require("../model/leagueTeam");
var TAG = "leagueTeam.rank";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var returnData = {};
    var leagueUid = "";
    var currentConfig;
    var key;
    var sTime = 0;

    async.series([function (cb) {
        lt.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    sTime = res[0];
                    currentConfig = res[2];
                    key = currentConfig["key"];
                    if (sTime >= jutil.now() || sTime + 86400 * 5.8 >= jutil.now()) {
                        cb("timeNotMatch");
                    } else {
                        cb();
                    }
                } else {
                    cb("configError");
                }
            }
        });
    }, function (cb) {//验证是否加入联盟
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
        lt.getRank(userUid, leagueUid, key, function (err, res) {
            returnData["rank"] = res;
            cb(err);
        });
    }, function (cb) {
        lt.getRankList(userUid, currentConfig, key, function (err, res) {
            returnData["rankList"] = res;
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