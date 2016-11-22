/**
 * Created by xiazhengxin on 2015/3/16 13:37.
 *
 * 极地大乱斗 设置奖励
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var mixContestData = require("../model/mixContestData");
var TAG = "pvp.mixContest.setReward";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "index") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var index = postData["index"];
    var sTime = 0;
    var isAll;
    var key;
    var formationList;
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
        mixContestData.getFormation(userUid, isAll, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                formationList = res;
                cb();
            }
        });
    }, function (cb) {
        for (var i = 1; i <= 8; i++) {
            var indexStr = "" + i;
            if (i == index) {
                formationList[indexStr]["reward"] = 1;
            } else {
                formationList[indexStr]["reward"] = 0;
            }
        }
        mixContestData.saveFormation(userUid, isAll, key, null, formationList, true, cb);
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {"status": "OK"});
        }
    });
}

exports.start = start;