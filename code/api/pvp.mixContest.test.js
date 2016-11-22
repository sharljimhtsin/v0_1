/**
 * Created by xiazhengxin on 2015/3/16 13:36.
 *
 * 极地大乱斗 测试 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var mixContestData = require("../model/mixContestData");
var TAG = "pvp.mixContest.test";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var sTime = 0;
    var isAll;
    var key;
    async.series([function (cb) {
        mixContestData.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else if (jutil.now() > res[0] - 0 + 86400) {
                sTime = res[0] - 0;
                isAll = parseInt(res[2]["isAll"]) || 0;
                key = res[2]["key"] || "1";
                cb(null);
            } else {
                sTime = res[0] - 0;
                isAll = parseInt(res[2]["isAll"]) || 0;
                key = res[2]["key"] || "1";
                cb(null);
            }
        });
    }, function (cb) {
        mixContestData.getRankList(userUid, isAll, key, 0, 1, function (err, res) {
            cb(err, res);
        });
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {"res": res});
        }
    });
}

exports.start = start;