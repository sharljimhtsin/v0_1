/**
 * 获取装备列表
 * User: liyuluan
 * Date: 13-10-14
 * Time: 上午11:41
 */

var equipment = require("../model/equipment");
var jutil = require("../utils/jutil");
var async = require("async");
var catalystData = require("../model/catalystData");
var upStarEquip = require("../model/upStarEquip");
var upStarEquipRefine = require("../model/upStarEquipRefine");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var equipRows;
    var columnPicked;
    var equipPicked;
    var starEquipData;
    var starEquipRefineData;
    async.series([function (cb) {
        equipment.getEquipment(userUid, function (err, res) {
            equipRows = res;
            cb(err);
        });
    }, function (cb) {
        catalystData.getPickedColumns(userUid, function (err, res) {
            equipPicked = res ? res : {};
            cb(err);
        });
    }, function (cb) {
        for (var uid in equipRows) {
            if (equipPicked.hasOwnProperty(uid)) {
                columnPicked = equipPicked[uid];
                var propertyUpgraded = {};
                for (var k in columnPicked) {
                    k = columnPicked[k];
                    propertyUpgraded[k] = equipRows[uid][k];
                }
                equipRows[uid]["equipAddValue"] = propertyUpgraded;
            } else {
                equipRows[uid]["equipAddValue"] = {};
            }
        }
        cb();
    }, function (cb) {
        upStarEquip.getAddition(userUid, function (err, res) {
            starEquipData = res;
            cb(err);
        });
    }, function (cb) {
        for (var uid in equipRows) {
            if (starEquipData.hasOwnProperty(uid)) {
                var addObj = starEquipData[uid];
                equipRows[uid]["equipStarAddValue"] = addObj;
            } else {
                equipRows[uid]["equipStarAddValue"] = {"attack": 0, "defence": 0, "hp": 0, "level": 0};
            }
        }
        cb();
    }, function (cb) {
        upStarEquipRefine.getAddition(userUid, function (err, res) {
            starEquipRefineData = res;
            cb(err);
        });
    }, function (cb) {
        for (var uid in equipRows) {
            if (starEquipRefineData.hasOwnProperty(uid)) {
                var addObj = starEquipRefineData[uid];
                equipRows[uid]["equipStarRefineAddValue"] = addObj;
            } else {
                equipRows[uid]["equipStarRefineAddValue"] = {"attack": 0, "defence": 0, "hp": 0, "level": 1};
            }
        }
        cb();
    }], function (err, res) {
        if (err) {
            response.echo("equipment.get", jutil.errorInfo("dbError"));
        } else {
            response.echo("equipment.get", equipRows);
        }
    });
}


exports.start = start;