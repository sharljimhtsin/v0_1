/**
 * Created by xiazhengxin on 2017/2/14.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var modelUtil = require("../model/modelUtil");
var equipment = require("../model/equipment");
var upStarEquip = require("../model/upStarEquip");
var upStarEquipRefine = require("../model/upStarEquipRefine");
var configManager = require("../config/configManager");
var upStarRecycle = require("../model/upStarRecycle");
var mongoStats = require("../model/mongoStats");
var user = require("../model/user");
var TAG = "upStar.equip.recycle";
var DEBUG = true;

function start(postData, response, query) {
    if (jutil.postCheck(postData, "equipmentUid") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var equipmentUid = postData["equipmentUid"];
    var userData = [];
    var returnData = [];
    var equipmentId;
    var equipmentData;
    var starRefineData;
    var starEquipData;
    var starRecycleData;
    var recycleData;
    var costData = {"id": "ingot", "count": 50};
    var equipData;
    var userObj;
    async.series([function (cb) {
        cb();// 占位
    }, function (cb) {
        equipment.getEquipment(userUid, function (err, res) {
            if (res && res.hasOwnProperty(equipmentUid)) {
                equipmentData = res[equipmentUid];
                equipmentId = equipmentData["equipmentId"];
                cb();
            } else {
                cb(err ? err : "NULL");
            }
        });
    }, function (cb) {
        upStarEquip.getStarData(userUid, function (err, res) {
            starEquipData = res;
            cb(err);
        });
    }, function (cb) {
        upStarEquipRefine.getStarData(userUid, function (err, res) {
            starRefineData = res;
            cb(err);
        });
    }, function (cb) {
        upStarRecycle.getStarData(userUid, function (err, res) {
            starRecycleData = res;
            cb(err);
        });
    }, function (cb) {
        if (starRecycleData && starRecycleData.hasOwnProperty(equipmentUid)) {
            recycleData = starRecycleData[equipmentUid];
        } else {
            recycleData = {};
        }
        cb();
    }, function (cb) {
        var refining = parseInt(equipmentData["refining"]);
        var refiningLevel = parseInt(equipmentData["refiningLevel"]);
        var configEquip = configManager.createConfig(userUid).getConfig("equip");
        var configItem = configManager.createConfig(userUid).getConfig("item");
        if (refining > 0) {
            var equipConfig = configEquip[equipmentId];//当前装备的配置
            var equipType = equipConfig["type"];//装备类别
            var giveItemId = getNeedItemId(equipType);//取得当前的装备精炼需要的精炼材料ID
            var itemValue = configItem[giveItemId]["typeValue"];
            var giveItemCount = refining / itemValue;
            if (recycleData.hasOwnProperty(giveItemId)) {
                recycleData[giveItemId] = giveItemCount + parseInt(recycleData[giveItemId]);
            } else {
                recycleData[giveItemId] = giveItemCount;
            }
            equipmentData["refining"] = 0;
            equipmentData["refiningLevel"] = 0;
            cb();
        } else {
            cb();
        }
    }, function (cb) {
        var level = parseInt(equipmentData["level"]);
        var configEquipUpgradeRatio = configManager.createConfig(userUid).getConfig("equipUpgradeRatio");
        var configEquip = configManager.createConfig(userUid).getConfig("equip");
        if (level > 1 && false) {//禁用装备强化回收模块
            var equipItemConfig = configEquip[equipmentId];//当前装备的配置
            var basePrice = parseInt(equipItemConfig["basePrice"]);//强化需要的基础金币
            var totalPoly = 0;
            for (var lv in configEquipUpgradeRatio) {
                if (level > parseInt(lv)) {
                    totalPoly += parseInt(configEquipUpgradeRatio[lv]);
                    continue;
                } else {
                    break;
                }
            }
            var price = basePrice * totalPoly;//需要花费的金币值
            if (recycleData.hasOwnProperty("gold")) {
                recycleData["gold"] = price + parseInt(recycleData["gold"]);
            } else {
                recycleData["gold"] = price;
            }
            equipmentData["level"] = 1;
            cb();
        } else {
            cb();
        }
    }, function (cb) {
        upStarRecycle.checkIfEnough(userUid, costData, cb);
    }, function (cb) {
        user.getUser(userUid, function (err, res) {
            userObj = res;
            cb(err);
        });
    }, function (cb) {
        recycleData[costData["id"]] = (costData["count"] * -1) + parseInt(recycleData[costData["id"]]);
        mongoStats.expendStats(costData["id"], userUid, "127.0.0.1", userObj, mongoStats.UPSTAR2, costData["count"]);
        var ids = Object.keys(recycleData);
        async.eachSeries(ids, function (id, eaCb) {
            modelUtil.addDropItemToDB(id, recycleData[id], userUid, 1, 1, function (err, res) {
                switch (id) {
                    case "ingot" && parseInt(recycleData[id]) < 0:
                        break;
                    default:
                        mongoStats.dropStats(id, userUid, "127.0.0.1", userObj, mongoStats.UPSTAR3, recycleData[id]);
                        break;
                }
                userData.push(res);
                returnData.push({"id": id, "count": recycleData[id]});
                eaCb(err);
            });
        }, cb);
    }, function (cb) {
        if (DEBUG) {
            console.log(recycleData);
        }
        if (starRecycleData && starRecycleData.hasOwnProperty(equipmentUid)) {
            delete starRecycleData[equipmentUid];
            upStarRecycle.setStarData(userUid, starRecycleData, cb);
        } else {
            cb();
        }
    }, function (cb) {
        if (DEBUG) {
            console.log(starEquipData);
        }
        if (starEquipData && starEquipData.hasOwnProperty(equipmentUid)) {
            delete starEquipData[equipmentUid];
            upStarEquip.setStarData(userUid, starEquipData, cb);
        } else {
            cb();
        }
    }, function (cb) {
        if (DEBUG) {
            console.log(starRefineData);
        }
        if (starRefineData && starRefineData.hasOwnProperty(equipmentUid)) {
            delete starRefineData[equipmentUid];
            upStarEquipRefine.setStarData(userUid, starRefineData, cb);
        } else {
            cb();
        }
    }, function (cb) {
        equipment.updateEquipment(userUid, equipmentUid, equipmentData, cb);
    }, function (cb) {
        equipment.getEquipment(userUid, function (err, res) {
            equipData = res;
            cb(err);
        });
    }, function (cb) {
        equipData[equipmentUid]["equipStarRefineAddValue"] = {"attack": 0, "defence": 0, "hp": 0, "level": 1};
        cb();
    }], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, {
                "userData": userData,
                "returnData": returnData,
                "equipData": equipData[equipmentUid]
            });
        }
    });
}

function getNeedItemId(equipType) {
    if (equipType == 12) return 150501;
    else if (equipType == 13) return 150601;
    else if (equipType == 14) return 150701;
    else return 0;
}

exports.start = start;