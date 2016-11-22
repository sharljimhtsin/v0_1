/**
 * Created by xiazhengxin on 2015/3/17 15:54.
 *
 * 极地大乱斗 获取英雄
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var mixContestData = require("../model/mixContestData");
var TAG = "pvp.mixContest.getHero";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "heroUid") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var heroUid = postData["heroUid"];
    var sTime = 0;
    var isAll;
    var key;
    var heroData;
    async.series([function (cb) {
        mixContestData.getConfig(userUid, function (err, res) {
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
        mixContestData.getHero(userUid, isAll, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                heroData = res[heroUid];
                cb();
            }
        });
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {"heroData": heroData});
        }
    });
}

exports.start = start;