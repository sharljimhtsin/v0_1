/**
 * Created by xiazhengxin on 2015/7/17 17:19.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var modifierData = require("../model/modifierData");
var TAG = "modifier.isActivated";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "skillUid") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var skillUid = postData["skillUid"];
    var configData;
    var activateCost;
    var freshCost;
    var skillData;
    var columnPicked;
    var isActivated = false;
    var propertyUpgraded = {};
    async.series([function (cb) {
        modifierData.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = res[2];
                activateCost = configData["activateCost"];
                freshCost = configData["freshCost"];
                cb();
            }
        });
    }, function (cb) {
        modifierData.getSkill(userUid, skillUid, function (err, res) {
            skillData = res;
            cb(err);
        });
    }, function (cb) {
        modifierData.getPickedColumns(userUid, function (err, res) {
            columnPicked = (res && res.hasOwnProperty(skillUid) ? res[skillUid] : null);
            cb(err);
        });
    }, function (cb) {
        isActivated = (columnPicked && columnPicked.length > 0 ? true : false);
        cb();
    }, function (cb) {
        for (var k in columnPicked) {
            k = columnPicked[k];
            propertyUpgraded[k] = skillData[k];
        }
        cb();
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {
                "columnPicked": columnPicked,
                "isActivated": isActivated,
                "equipAddValue": propertyUpgraded,
                "activateCost": activateCost,
                "freshCost": freshCost
            });
        }
    });
}

exports.start = start;