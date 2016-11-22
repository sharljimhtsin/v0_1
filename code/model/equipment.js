/**
 * 装备数据处理
 * User: liyuluan
 * Date: 13-10-14
 * Time: 上午11:48
 */

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var modelUtil = require("../model/modelUtil");
var achievement = require("../model/achievement");
var configManager = require("../config/configManager");
var async = require("async");
/**
 * 添加装备
 * @param userUid
 * @param equipmentId
 * @param level
 * @param callbackFn
 */
function addEquipment(userUid, equipmentId, level, callbackFn) {
    redis.getNewId(userUid, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            var sql = 'INSERT INTO equipment SET ?';
            var newData = {};
            newData["userUid"] = userUid;
            newData["equipmentUid"] = res - 0;
            newData["equipmentId"] = equipmentId;
            newData["level"] = level || 1;
            mysql.game(userUid).query(sql, newData, function (err, res) {
                if (err) {
                    callbackFn(err, null);
                } else {
                    var configData = configManager.createConfig(userUid);
                    var equipConfig = configData.getConfig("equip");
                    var equipData = equipConfig[equipmentId];
                    if (equipData["star"] == 4) { // S 装备
                        achievement.equipGet(userUid, 1, function () {
                            callbackFn(null, newData);
                        });
                    } else {
                        callbackFn(null, newData);
                    }
                }
            });
        }
    });
}


/**
 * 更新装备的等级
 * @param userUid 用户uid
 * @param equipmentUid 装备Uid
 * @param newLevel 更新到的等级
 * @param callbackFn
 */
function updateEquipmentLevel(userUid, equipmentUid, newLevel, callbackFn) {
    var sql = "UPDATE equipment SET ? WHERE userUid = " + mysql.escape(userUid) + " AND equipmentUid = " + mysql.escape(equipmentUid);
    var newData = {"level": newLevel};
    mysql.game(userUid).query(sql, newData, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            callbackFn(null, 1);
        }
    });
}

/**
 * 更新精炼值
 * @param userUid
 * @param equipmentUid
 * @param refining
 * @param refiningLevel
 * @param callbackFn
 */
function updateEquipmentRefining(userUid, equipmentUid, refining, refiningLevel, callbackFn) {
    var sql = "UPDATE equipment SET ? WHERE userUid = " + mysql.escape(userUid) + " AND equipmentUid = " + mysql.escape(equipmentUid);
    var newData = {"refining": refining, "refiningLevel": refiningLevel};
    mysql.game(userUid).query(sql, newData, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            callbackFn(null, 1);
        }
    });
}

/**
 * 装备ID
 * @param userUid
 * @param callbackFn
 */
function getEquipment(userUid, callbackFn) {
    modelUtil.getData("equipment", userUid, callbackFn, "equipmentUid");
}

function getEquipmentUpgradeData(configData, equipId, equipLevel, userData, callBack) {//获取当前用户所能强化的最大等级
    var vipLevel = userData["vip"];
    var gold = userData["gold"];
    var userLevel = userData["lv"] - 0;
    var equipmentId = equipId;//装备的ID
    var equipmentLevel = equipLevel;//装备的等级
    var equipUpgradeRatioConfig = configData.getConfig("equipUpgradeRatio");//装备升级需要的金币配置
    var equipConfig = configData.getConfig("equip");//装备配置
    var equipItemConfig = equipConfig[equipmentId];//当前装备的配置
    var basePrice = equipItemConfig["basePrice"] - 0;//强化需要的基础金币
    var price = basePrice * (equipUpgradeRatioConfig[equipmentLevel] - 0);//需要花费的金币值
    var VIPPurview = configData.getVIPPurview(vipLevel);
    var equipMaxUpgrade = VIPPurview["equipMaxUpgrade"] - 0;
    var returnData = {};
    if (price > gold) {
        callBack("noMoney", null);
        return;
    } else if (userLevel * 3 <= equipmentLevel) {
        callBack("levelOverflow", null);
        return;
    }
    while (userLevel * 3 > equipmentLevel && price <= gold) {//开始强化
        var addLevel = Math.floor(Math.random() * equipMaxUpgrade) + 1;
        equipmentLevel = equipmentLevel + addLevel;
        var needGold = price + basePrice * (equipUpgradeRatioConfig[equipmentLevel] - 0);
        if (needGold > gold || equipmentLevel >= userLevel * 3) {//下一次强化需要的金币
            break;
        }
        price = needGold;
    }
    returnData["price"] = price;
    returnData["level"] = equipmentLevel;
    callBack(null, returnData);
}
/**
 * 移除一个或多个装备
 * @param userUid
 * @param equipmentUid
 * @param callbackFn
 */
function removeEquipment(userUid, equipmentUids, callbackFn) {
    var sql = null;
    if (equipmentUids instanceof Array == true) {
        var mUids = "";
        for (var i = 0; i < equipmentUids.length; i++) {
            if (mUids != "") mUids = mUids + ",";
            mUids = mUids + mysql.escape(equipmentUids[i]);
        }
        sql = "DELETE FROM equipment WHERE userUid = " + mysql.escape(userUid) + " AND equipmentUid IN(" + mUids + ")";
    } else {
        sql = "DELETE FROM equipment WHERE userUid = " + mysql.escape(userUid) + " AND equipmentUid = " + mysql.escape(equipmentUids);
    }

    mysql.game(userUid).query(sql, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            callbackFn(null, 1);
        }
    });
}

/**更新装备数据--za(涉及功能：宝石)
 * @param equipmentUid
 * @param callbackFn
 */
function updateEquipment(userUid, equipmentUid, equipmentData, callbackFn) {//4378853390 测试装备：468035638920450
    var sql = "UPDATE equipment SET ? WHERE userUid = " + mysql.escape(userUid) + " AND equipmentUid = " + mysql.escape(equipmentUid);
    mysql.game(userUid).query(sql, equipmentData, function (err, res) {
        if (err || res == null) callbackFn(err, res);
        else {
            callbackFn(null, 1);
        }
    });
}

exports.addEquipment = addEquipment;
exports.getEquipment = getEquipment;
exports.updateEquipmentLevel = updateEquipmentLevel;
exports.updateEquipmentRefining = updateEquipmentRefining;
exports.removeEquipment = removeEquipment;
exports.getEquipmentUpgradeData = getEquipmentUpgradeData;
exports.updateEquipment = updateEquipment;//更新装备数据