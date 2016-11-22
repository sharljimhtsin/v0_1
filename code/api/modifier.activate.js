/**
 * Created by xiazhengxin on 2015/7/17 17:18.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var modifierData = require("../model/modifierData");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var TAG = "modifier.activate";

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
    var content;
    var skillData;
    var isFirst = true;
    var userData = [];
    var columnPicked;
    var equipPicked;
    var propertyUpgraded = {};
    async.series([function (cb) {
        modifierData.getConfig(userUid, function (err, res) {
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
        modifierData.getSkill(userUid, skillUid, function (err, res) {
            skillData = res;
            cb(err);
        });
    }, function (cb) {
        modifierData.getPickedColumns(userUid, function (err, res) {
            equipPicked = res ? res : {};
            columnPicked = (equipPicked && equipPicked.hasOwnProperty(skillUid) ? equipPicked[skillUid] : null);
            cb(err);
        });
    }, function (cb) {
        isFirst = (columnPicked && columnPicked.length > 0 ? false : true);
        cb();
    }, function (cb) {
        if (isFirst) {
            async.series([function (seCb) {
                async.eachSeries(activateCost, function (item, eaCb) {
                    modifierData.checkIfEnough(userUid, item, function (err, isOk) {
                        if (err) {
                            eaCb(err);
                        } else if (isOk) {
                            modelUtil.addDropItemToDB(item["id"], item["count"] * -1, userUid, 1, 1, function (err, res) {
                                mongoStats.expendStats(item["id"], userUid, "127.0.0.1", null, mongoStats.E_CATALYST1, item["count"]);
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
        } else {
            cb();
        }
    }, function (cb) {
        if (isFirst) {
            var propertyList = jutil.deepCopy(content);
            // 随机顺序
            propertyList.sort(function () {
                return 0.5 - Math.random();
            });
            columnPicked = [];
            do {
                var compareRate = 0;
                var randomRate = Math.random();
                for (var i in propertyList) {
                    var h = propertyList[i];
                    compareRate += (h["prob"] - 0);
                    if (randomRate <= compareRate && columnPicked.length < 4) {
                        if (columnPicked.indexOf(h["type"]) == -1) {
                            columnPicked.push(h["type"]);
                        }
                    }
                }
            } while (columnPicked.length < 4);
        }
        cb();
    }, function (cb) {
        if (isFirst) {
            equipPicked[skillUid] = columnPicked;
            modifierData.setPickedColumns(userUid, equipPicked, cb);
        } else {
            cb();
        }
    }, function (cb) {
        for (var k in columnPicked) {
            k = columnPicked[k];
            propertyUpgraded[k] = skillData[k] ? skillData[k] : 0;
        }
        cb();
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {
                "columnPicked": columnPicked,
                "userData": userData,
                "equipAddValue": propertyUpgraded
            });
        }
    });
}

exports.start = start;