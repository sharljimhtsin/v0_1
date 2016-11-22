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

function start(postData, response, query) {
    var userUid = query["userUid"];
    var equipRows;
    var columnPicked;
    var equipPicked;
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
    }], function (err, res) {
        if (err) {
            response.echo("equipment.get", jutil.errorInfo("dbError"));
        } else {
            response.echo("equipment.get", equipRows);
        }
    });
}


exports.start = start;