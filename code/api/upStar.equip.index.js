/**
 * Created by xiazhengxin on 2017/1/18.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var equipment = require("../model/equipment");
var upStar = require("../model/upStarEquip");
var TAG = "upStar.equip.index";
var DEBUG = true;

function start(postData, response, query) {
    if (jutil.postCheck(postData, "equipmentUid") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var equipmentUid = postData["equipmentUid"];
    var configData;
    var isFirst = true;
    var starData;
    var singleData = {};
    var equipmentId;
    var starEquipData;
    async.series([function (cb) {
        equipment.getEquipment(userUid, function (err, res) {
            if (res && res.hasOwnProperty(equipmentUid)) {
                equipmentId = res[equipmentUid]["equipmentId"].toString();
                cb();
            } else {
                cb(err ? err : "NULL");
            }
        });
    }, function (cb) {
        upStar.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = jutil.deepCopy(res[2]);
                cb();
            }
        });
    }, function (cb) {
        upStar.getStarData(userUid, function (err, res) {
            starData = res ? res : {};
            cb(err);
        });
    }, function (cb) {
        isFirst = (starData && starData.hasOwnProperty(equipmentUid) ? false : true);
        cb();
    }, function (cb) {
        if (isFirst) {
            singleData["level"] = -1;
            singleData["lucky"] = 0;
            singleData["luckyDay"] = 0;
            singleData["exp"] = 0;
            singleData["attr"] = 0;
            singleData["add"] = 0;
            singleData["type"] = equipmentId.substr(0, 2);
            singleData["lucky_total"] = configData["level"]["0"]["lucky"];
            singleData["exp_total"] = configData["level"]["0"]["exp"];
            singleData["fail_total"] = configData["level"]["0"]["fail"];
            singleData["base_total"] = configData["level"]["0"]["base"];
            singleData["add_next"] = configData["attrExtra"][singleData["type"]]["0"];
        } else {
            singleData = starData[equipmentUid];
        }
        cb();
    }, function (cb) {
        if (isFirst) {
            var count = configData["count"];
            var item = configData["item"];
            singleData["nextPriceItem"] = {"id": item["0"], "count": count["item"]};
            singleData["nextPriceIngot"] = {"id": "ingot", "count": count["ingot"]};
            starData[equipmentUid] = singleData;
            upStar.setStarData(userUid, starData, cb);
        } else {
            cb();
        }
    }, function (cb) {
        if (DEBUG) {
            console.log(singleData);
        }
        //兼容客户端等级从1开始
        singleData["level"] = parseInt(singleData["level"]) + 1;
        //幸运值隔日清零
        singleData["lucky"] = jutil.compTimeDay(singleData["luckyDay"], jutil.now()) ? singleData["lucky"] : 0;
        cb();
    }, function (cb) {
        upStar.getAddition(userUid, function (err, res) {
            starEquipData = res;
            cb(err);
        });
    }, function (cb) {
        if (starEquipData.hasOwnProperty(equipmentUid)) {
            var addObj = starEquipData[equipmentUid];
            singleData["equipStarAddValue"] = addObj;
        } else {
            singleData["equipStarAddValue"] = {};
        }
        cb();
    }], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, {
                "starData": singleData
            });
        }
    });
}

exports.start = start;