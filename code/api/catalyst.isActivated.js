/**
 * Created by xiazhengxin on 2015/6/24 20:03.
 *
 * 布利夫博士研究所 获取装备状态
 */

var async = require("async");
var jutil = require("../utils/jutil");
var catalystData = require("../model/catalystData");
var TAG = "catalyst.isActivated";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "equipmentUid") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var equipmentUid = postData["equipmentUid"];
    var configData;
    var activateCost;
    var freshCost;
    var equipmentData;
    var columnPicked;
    var isActivated = false;
    var propertyUpgraded = {};
    async.series([function (cb) {
        catalystData.getConfig(userUid, function (err, res) {
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
        catalystData.getEquipment(userUid, equipmentUid, function (err, res) {
            equipmentData = res;
            cb(err);
        });
    }, function (cb) {
        catalystData.getPickedColumns(userUid, function (err, res) {
            columnPicked = (res && res.hasOwnProperty(equipmentUid) ? res[equipmentUid] : null);
            cb(err);
        });
    }, function (cb) {
        isActivated = (columnPicked && columnPicked.length > 0 ? true : false);
        cb();
    }, function (cb) {
        for (var k in columnPicked) {
            k = columnPicked[k];
            propertyUpgraded[k] = equipmentData[k];
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