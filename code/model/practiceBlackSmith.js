/**
 * Created with JetBrains WebStorm.
 * 铁匠铺model
 * User: za
 * Date: 15-11-27 预计三天
 * Time: 下午17:50
 * To change this template use File | Settings | File Templates.
 */
var async = require("async");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var mongoStats = require("../model/mongoStats");
var skill = require("../model/skill");
var equipment = require("../model/equipment");
var card = require("../model/card");
var item = require("../model/item");
var user = require("../model/user");
var heroSoul = require("../model/heroSoul");

var ACTIVITY_CONFIG_NAME = "blackSmith";
//获取配置
function getConfig(userUid, callbackFn) {
    // 1.获取活动配置数据
    activityConfig.getConfig(userUid, ACTIVITY_CONFIG_NAME, function (err, res) {
        if (err || res == null)callbackFn("CannotgetConfig");
        else {
            if (res[0]) {
                var sTime = res[4];
                var eTime = res[5];
                var currentConfig = res[2];
                callbackFn(null, [sTime, eTime, currentConfig]);
            } else {
                callbackFn("notOpen");
            }
        }
    });
}
//取用户数据
function getUserData(userUid, sTime, callbackFn) {
    activityData.getActivityData(userUid, activityData.PRACTICE_BLACKSMITH, function (err, res) {
        var userData = {"data": 0, "dataTime": sTime, "status": 0, "statusTime": 0, "arg": {}};
        if (res != null && res["dataTime"] == sTime) {
            if (err) {
                callbackFn(err);
            } else {
                userData = res;
                redis.user(userUid).s("practice:" + ACTIVITY_CONFIG_NAME).getObj(function (err, res) {
                    userData["arg"] = res;
                    if (res == null)
                        userData["arg"] = {};
                    callbackFn(err, userData);
                });
            }
        } else {
            callbackFn(null, userData);
        }
    });
}
//设置用户数据
function setUserData(userUid, userData, callbackFn) {
    var arg = userData["arg"];
    delete userData["arg"];
    activityData.updateActivityData(userUid, activityData.PRACTICE_BLACKSMITH, userData, function (err, res) {
        redis.user(userUid).s("practice:" + ACTIVITY_CONFIG_NAME).setObj(arg, callbackFn);
    });
}
function checkItem(userUid, itemList, callbackFn) {
    if (itemList.length <= 0) {
        callbackFn("postError");
        return;
    }
    async.eachSeries(itemList, function (itemData, esCb) {
        var error = "propsNotExist";
        var type = getTypeOfId(itemData["id"].toString());
        var itemUids = [];
        switch (type) {
            case "10"://skill
                heroSoul.getHeroSoulItem(userUid, itemData["id"], function (err, res) {
                    if (err) {
                        esCb(err);
                    } else if (res == null) {
                        esCb(null, false);
                    } else {
                        esCb(null, res["count"] >= itemData["count"]);
                    }
                });
                break;
            case "11"://skill
                skill.getSkill(userUid, function (err, res) {
                    if (!err && res != null) {
                        error = null;
                        for (var i in res) {
                            if (res[i]["skillId"] == itemData["id"]) {
                                itemUids.push(res[i]["skillUid"]);
                            }
                        }
                        for (var i in itemData["itemUid"]) {
                            if (itemUids.indexOf(itemData["itemUid"][i]) == -1) {
                                error = "postError";
                            }
                        }
                    }
                    esCb(error);
                });
                break;
            case 'equip':
            case "12"://装备
            case "13"://装备
            case "14"://装备
                equipment.getEquipment(userUid, function (err, res) {
                    if (!err && res != null) {
                        error = null;
                        for (var i in res) {
                            if (type == 'equip' || res[i]["equipmentId"] == itemData["id"]) {
                                itemUids.push(res[i]["equipmentUid"]);
                            }
                        }
                        for (var i in itemData["itemUid"]) {
                            if (itemUids.indexOf(itemData["itemUid"][i]) == -1) {
                                error = "postError";
                            }
                        }
                    }
                    esCb(error);
                });
                break;
            case "15"://item
                item.getItem(userUid, itemData["id"], function (err, res) {
                    if (!err && res != null && res["number"] - itemData["count"] >= 0) {
                        error = null;
                    }
                    esCb(error);
                });
                break;
            case "17"://卡片
                card.getCardList(userUid, function (err, res) {
                    if (!err && res != null) {
                        error = null;
                        for (var i in res) {
                            if (res[i]["cardId"] == itemData["id"]) {
                                itemUids.push(res[i]["cardUid"]);
                            }
                        }
                        for (var i in itemData["itemUid"]) {
                            if (itemUids.indexOf(itemData["itemUid"][i]) == -1) {
                                error = "postError";
                                break;
                            }
                        }
                    }
                    esCb(error);
                });
                break;
            case "ingot"://金币
            case "gold"://索尼
                user.getUser(userUid, function (err, res) {
                    if (!err && res != null && res["ingot"] - itemData["count"] >= 0) {
                        error = null;
                    } else if (!err && res != null && res["gold"] - itemData["count"] >= 0) {
                        error = null;
                    }
                    esCb(error);
                });
                break;
            default :
                error = "postError";
                esCb(error);
                break;
        }
    }, callbackFn);
}

function processItem(userUid, itemList, callbackFn) {
    var returnData = [];
    async.eachSeries(itemList, function (itemData, esCb) {
        var type = getTypeOfId(itemData["id"].toString());
        switch (type) {
            case "10"://skill
                heroSoul.delHeroSoulItem(userUid, itemData["id"], itemData["count"], function (err, res) {
                    returnData.push(res);
                    esCb(err);
                });
                break;
            case "11"://skill
                async.eachSeries(itemData["itemUid"], function (itemUid, essCb) {
                    skill.removeSkill(userUid, itemUid, essCb);
                }, esCb);
                break;
            case 'equip':
            case "12"://装备
            case "13"://装备
            case "14"://装备
                async.eachSeries(itemData["itemUid"], function (itemUid, essCb) {
                    equipment.removeEquipment(userUid, itemUid, essCb);
                }, esCb);
                break;
            case "15"://item
                item.updateItem(userUid, itemData["id"], -itemData["count"], function (err, res) {
                    returnData.push(res);
                    esCb(err);
                });
                break;
            case "17"://卡片
                card.delCard(userUid, itemData["itemUid"], esCb);
                break;
            case "ingot"://金币
            case "gold"://索尼
                esCb();
                break;
            default :
                esCb("postError");
                break;
        }
    }, function (err, res) {
        callbackFn(err, returnData);
    });
}

function getTypeOfId(itemId) {
    if (itemId == 'equip') {
        return 'equip';
    } else if (itemId == 'ingot') {
        return 'ingot';
    } else if (itemId == 'gold') {
        return 'gold';
    } else {
        return itemId.substr(0, 2);
    }
}
exports.getConfig = getConfig;//获取配置
exports.getUserData = getUserData;//取用户数据
exports.setUserData = setUserData;//设置用户数据
exports.checkItem = checkItem;
exports.processItem = processItem;
