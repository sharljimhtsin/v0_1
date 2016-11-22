/**
 * Created by xiazhengxin on 2015/1/23 12:45.
 *
 * 天下第一武道会 获取阵型接口
 */

var async = require("async");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var globalContestData = require("../model/globalContestData");
var formation = require("../model/formation");
var user = require("../model/user");
var TAG = "pvp.globalContest.getFormation";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var retList = [];

    async.series([function (cb) {
        globalContestData.getUserData(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else if (res["status"] == 0) {
                cb("notJoin");
            } else {
                cb(null);
            }
        });
    }, function (cb) {
        formation.getGlobalFormation(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                retList = res;
                cb(null);
            }
        });
    }, function (cb) {
        formation.getUserFormation(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                for (var a in retList) {
                    for (var b in res) {
                        if (res[b]["heroUid"] == retList[a]["heroUid"]) {
                            retList[a] = res[b];
                            retList[a]["formationUid"] = a;
                            break;
                        }
                    }
                }
                cb(null);
            }
        });
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {"formation": retList});
        }
    });
}

exports.start = start;