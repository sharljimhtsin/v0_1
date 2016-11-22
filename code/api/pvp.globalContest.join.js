/**
 * Created by xiazhengxin on 2015/1/21 15:15.
 *
 * 天下第一武道会 活动参加接口
 */

var async = require("async");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var globalContestData = require("../model/globalContestData");
var formation = require("../model/formation");
var user = require("../model/user");
var hero = require("../model/hero");
var TAG = "pvp.globalContest.join";
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "formation") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var formationData = postData["formation"];
    var sTime = 0;
    var isAll;
    var key;
    var heroList;
    async.series([function (cb) {
        globalContestData.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else if (jutil.now() > res[0] - 0 + 86400) {
                cb("timeOut");
            } else {
                sTime = res[0] - 0;
                isAll = parseInt(res[2]["isAll"]) || 0;
                key = res[2]["key"] || "1";
                cb(null);
            }
        });
    }, function (cb) {
        hero.getHero(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                heroList = res;
                cb();
            }
        });
    }, function (cb) {
        if (formationData.length > 0) {
            formation.addHeroToGlobalFormation(userUid, formationData, cb);
        } else {
            cb("postError");
        }
    }, function (cb) {
        stats.events(userUid,"127.0.0.1",null,mongoStats.globalContest_join);
        globalContestData.joinActivity(userUid, isAll, key, sTime, cb);
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {"joined": 1});
        }
    });
}

exports.start = start;