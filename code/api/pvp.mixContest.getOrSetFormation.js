/**
 * Created by xiazhengxin on 2015/3/16 13:36.
 *
 * 极地大乱斗 获取、重新排列阵型
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var mixContestData = require("../model/mixContestData");
var TAG = "pvp.mixContest.getOrSetFormation";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "formation") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var formation = postData["formation"];
    var sTime = 0;
    var isAll;
    var key;
    var list;
    var readOnly;
    var formationData;
    async.series([function (cb) {
        mixContestData.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else if (jutil.now() > res[0] - 0 + 86400) {
                readOnly = 1;
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
        mixContestData.getUserData(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else if (res["status"] == "0") {
                cb("budokai_lb_noSign");
            } else {
                cb();
            }
        });
    }, function (cb) {
        mixContestData.getFormation(userUid, isAll, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                formationData = res;
                cb();
            }
        });
    }, function (cb) {
        if (formation != "" && readOnly != 1) {
            var map = {};
            if (Object.keys(formation).length != 8) {
                cb("data error");
            } else {
                for (var i in formation) {
                    var index = formation[i];
                    var newIndex = i - 0 + 1;
                    map[newIndex + ""] = jutil.deepCopy(formationData[index + ""]);
                    map[newIndex + ""]["formationUid"] = newIndex;
                }
                mixContestData.saveFormation(userUid, isAll, key, null, map, true, cb);
            }
        } else if (formation != "" && readOnly == 1) {
            cb("forbidden");
        } else {
            cb();
        }
    }, function (cb) {
        mixContestData.getBattleNeedData(userUid, isAll, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                list = res;
                list["hero"] = list["heroList"];
                list["formation"] = list["formationList"];
                list["equip"] = list["equipList"];
                list["skill"] = list["skillList"];
                list["gravity"] = list["gravityList"];
                delete list["heroList"];
                delete list["formationList"];
                delete list["equipList"];
                delete list["skillList"];
                delete list["gravityList"];
                cb();
            }
        });
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {"list": list});
        }
    });
}

exports.start = start;