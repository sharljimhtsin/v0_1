/**
 * Created by xiazhengxin on 2015/6/24 15:11.
 *
 * 布利夫博士研究所 装备洗练
 */

var async = require("async");
var jutil = require("../utils/jutil");
var catalystData = require("../model/catalystData");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var TAG = "catalyst.react";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "equipmentUid", "index") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var equipmentUid = postData["equipmentUid"];
    var index = postData["index"];
    var configData;
    var activateCost;
    var freshCost;
    var content;
    var equipmentData;
    var userData = [];
    var columnPicked;
    var equipPicked;
    var propertyUpgraded = {};
    var propertyExclude;
    var propertySelected;
    async.series([function (cb) {
        catalystData.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = res[2];
                activateCost = configData["activateCost"];
                freshCost = configData["freshCost"];
                content = configData["content"];
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
            equipPicked = res ? res : {};
            columnPicked = (equipPicked && equipPicked.hasOwnProperty(equipmentUid) ? equipPicked[equipmentUid] : null);
            cb(err);
        });
    }, function (cb) {
        async.series([function (seCb) {
            async.eachSeries(freshCost, function (item, eaCb) {
                catalystData.checkIfEnough(userUid, item, function (err, isOk) {
                    if (err) {
                        eaCb(err);
                    } else if (isOk) {
                        modelUtil.addDropItemToDB(item["id"], item["count"] * -1, userUid, 1, 1, function (err, res) {
                            mongoStats.expendStats(item["id"], userUid, "127.0.0.1", null, mongoStats.E_CATALYST2, item["count"]);
                            userData.push(res);
                            eaCb(err);
                        });
                    } else {
                        eaCb("not enough");
                    }
                });
            }, function (err, res) {
                seCb(err);
            })
        }, function (seCb) {
            seCb();
        }], function (err, res) {
            cb(err);
        });
    }, function (cb) {
        propertyExclude = jutil.deepCopy(columnPicked);
        delete propertyExclude[index];
        cb();
    }, function (cb) {
        var propertyList = jutil.deepCopy(content);
        // 按照概率升序顺序，相等则随机排序
        propertyList.sort(function (x, y) {
            if (x["prob"] > y["prob"])
                return 1;
            if (x["prob"] < y["prob"])
                return -1;
            else
                return 0.5 - Math.random();
        });
        do {
            var compareRate = 0;
            var randomRate = Math.random();
            for (var i in propertyList) {
                var h = propertyList[i];
                compareRate += (h["prob"] - 0);
                if (randomRate <= compareRate && propertyExclude.indexOf(h["type"]) == -1) {
                    propertySelected = h;
                    break;
                }
            }
        } while (!propertySelected);
        cb();
    }, function (cb) {
        var data = {};
        data[propertySelected["type"]] = propertySelected["count"];
        if (columnPicked.indexOf(propertySelected["type"]) >= 0) {
            // nothing to do
        } else {
            // reset previous column value to zero
            data[columnPicked[index]] = 0;
        }
        catalystData.setEquipment(userUid, equipmentUid, data, cb);
    }, function (cb) {
        // replace & save new generated columns
        columnPicked[index] = propertySelected["type"];
        equipPicked[equipmentUid] = columnPicked;
        catalystData.setPickedColumns(userUid, equipPicked, cb);
    }, function (cb) {
        catalystData.getEquipment(userUid, equipmentUid, function (err, res) {
            equipmentData = res;
            cb(err);
        });
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
                "userData": userData,
                "equipAddValue": propertyUpgraded,
                "propertySelected": propertySelected
            });
        }
    });
}

exports.start = start;