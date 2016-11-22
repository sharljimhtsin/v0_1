/**
 * Created by xiazhengxin on 2015/3/21 17:22.
 *
 * 极地大乱斗 排行奖励
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var mixContestData = require("../model/mixContestData");
var TAG = "pvp.mixContest.rankReward";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var sTime = 0;
    var isAll;
    var key;
    var rewardList;
    async.series([function (cb) {
        mixContestData.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                sTime = res[0] - 0;
                isAll = parseInt(res[2]["isAll"]) || 0;
                key = res[2]["key"] || "1";
                rewardList = res[2]["rankReward"] || [];
                cb(null);
            }
        });
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, rewardList);
        }
    });
}

exports.start = start;