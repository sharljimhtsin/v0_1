/**
 * Created by xiazhengxin on 2017/2/7.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var equipment = require("../model/equipment");
var upStar = require("../model/upStarEquipRefine");
var configManager = require("../config/configManager");
var TAG = "upStar.equip.refine.index";
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
    var starId;
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
            var configEquip = configManager.createConfig(userUid).getConfig("equip");
            starId = configEquip.hasOwnProperty(equipmentId) ? configEquip[equipmentId]["star"] : 1;
            singleData["level"] = 1;
            singleData["exp"] = 0;
            singleData["attr"] = 0;
            singleData["add"] = 0;
            singleData["type"] = equipmentId.substr(0, 2);
            singleData["star"] = starId;
            singleData["exp_total"] = configData["exp"][starId]["1"];
            singleData["add_next"] = configData["attr"][singleData["type"]]["normal"][starId];
        } else {
            singleData = starData[equipmentUid];
        }
        cb();
    }, function (cb) {
        if (isFirst) {
            starData[equipmentUid] = singleData;
            upStar.setStarData(userUid, starData, cb);
        } else {
            cb();
        }
    }, function (cb) {
        if (DEBUG) {
            console.log(singleData);
        }
        cb();
    }, function (cb) {
        upStar.getAddition(userUid, function (err, res) {
            starEquipData = res;
            cb(err);
        });
    }, function (cb) {
        if (starEquipData.hasOwnProperty(equipmentUid)) {
            var addObj = starEquipData[equipmentUid];
            singleData["equipStarRefineAddValue"] = addObj;
        } else {
            singleData["equipStarRefineAddValue"] = {"attack": 0, "defence": 0, "hp": 0, "level": 1};
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