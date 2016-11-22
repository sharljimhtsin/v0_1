/**
 * 数据层的公用方法代码
 * 对逻辑相同的代码进行处理
 * User: liyuluan
 * Date: 13-10-14
 * Time: 下午3:13
 */
var mysql = require("../alien/db/mysql");
var formation = require("../model/formation");
var debris = require("../model/debris");
var heroSoul = require("../model/heroSoul");
var hero = require("../model/hero");
var item = require("../model/item");
var skill = require("../model/skill");
var configManager = require("../config/configManager");
var equipment = require("../model/equipment");
var user = require("../model/user");
var teach = require("../model/teach");
var card = require("../model/card");
var userVariable = require("../model/userVariable");
var async = require("async");
var jutil = require("../utils/jutil");


/**
 * 取某个表中某个用户的数据
 * @param from
 * @param userUid
 * @param callbackFn
 * @param [keyName]  做为索引的
 */
function getData(from, userUid, callbackFn, keyName) {
    var sql = "SELECT * FROM " + from + " WHERE userUid = " + mysql.escape(userUid);
    mysql.game(userUid).query(sql, function (err, res) {
        if (err || res == null) {
            callbackFn(err, null);
        } else {
            var mData = {};
            if (keyName) {
                for (var i = 0; i < res.length; i++) {
                    var mItem = res[i];
                    var mHeroUid = mItem[keyName];
                    mData[mHeroUid] = mItem;
                }
            }
            callbackFn(null, mData);
        }
    });
}

function delData(from, userUid, callbackFn) {
    var sql = "DELETE FROM " + from + " WHERE userUid = " + mysql.escape(userUid);
    mysql.game(userUid).query(sql, function (err, res) {
        callbackFn(err, res);
    });
}


//每个表对应的某个物品Uid的字段名
var dataUidDic = {
    "formation": "formationUid",
    "hero": "heroUid",
    "equipment": "equipmentUid",
    "skill": "skillUid"
};

/**
 * 取得一个玩家的多个数据详细信息
 * @param userUid 用户ID
 * @param {Array} dataType 需要取的数据名字
 * @param callbackFn
 */
function getUserData(userUid, dataType, callbackFn) {
    async.map(dataType, function (item, cb) {
        if (item == "heroHash" || item == "hero") {
            hero.getHero(userUid, cb);
        } else {
            getData(item, userUid, cb, dataUidDic[item]);
        }
    }, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            var returnObj = {};
            for (var i = 0; i < res.length; i++) {
                returnObj[dataType[i]] = res[i];
            }
            callbackFn(null, returnObj);
        }
    });
}

function addDropItemToDB(dropId, dropCount, userUid, isPatch, level, callBack, arg6, arg7) {
    var dropId = dropId + "";
    dropCount = dropCount || 1;
    dropCount = dropCount - 0;
    var configData = configManager.createConfig(userUid);
    var isHero = false;
    var isReturnAll = false;
    var equipList = [];
    var skillList = [];
    if (arg6) {
        isHero = callBack;
        callBack = arg6;
    }
    if (arg7) {
        isReturnAll = true;
    }
    switch (dropId.substr(0, 2)) {
        case "10"://hero 魂魄
            if (isHero == false) {
                heroSoul.addHeroSoul(userUid, dropId, dropCount, function (err, res) {
                    if (err || res == null) {
                        callBack(err, null);
                    } else {
                        callBack(null, res);
                    }
                });
            } else {
                hero.addHero(userUid, dropId, 0, 1, function (err, res) {
                    callBack(err, res);
                });
            }
            break;
        case "11"://skill 技能  或者技能碎片
            var skillC = configData.getConfig("skill");
            var skillItem = skillC[dropId];
            if (isPatch == 1) { //碎片
                var pathIndex = Math.floor(Math.random() * (skillItem["patchCount"] - 0)) + 1;
                debris.addDebris(userUid, dropId, "type" + pathIndex, dropCount, 1, function (err, res) {
                    if (err || res == null) {
                        callBack(err, null);
                    } else {
                        callBack(null, res);
                    }
                });
            } else {
                level = level || 1;
                var exp = 0;
                if (level > 1) {
                    var skillUpgradeNeedExpConfig = configData.getConfig("skillUpgradeNeedExp");//技能升级需要的经验配置
                    var skillStar = skillC[dropId]["star"];//要升级的技能的星级
                    var skillNeedExpList = skillUpgradeNeedExpConfig[skillStar]["needExp"];//当前技能的每级需要的经验表
                    exp = skillNeedExpList[level - 1] - 0;
                }
                async.timesSeries(dropCount, function (n, cb) {
                    skill.addSkill(userUid, dropId, exp, level, function (err, res) {
                        if (err || res == null) {
                            cb(err);
                        } else {
                            if (isReturnAll) {
                                skillList.push(res);
                            } else {
                                skillList = res;
                            }
                            cb(null);
                        }
                    });
                }, function (err, res) {
                    callBack(err, skillList);
                });
            }
            break;
        case "12"://装备
        case "13"://装备
        case "14"://装备
            async.timesSeries(dropCount, function (n, cb) {
                equipment.addEquipment(userUid, dropId, level, function (err, res) {
                    if (err || res == null) {
                        cb(err);
                    } else {
                        if (isReturnAll) {
                            equipList.push(res);
                        } else {
                            equipList = res;
                        }
                        cb(null);
                    }
                });
            }, function (err, res) {
                callBack(err, equipList);
            });
            break;
        case "15"://item
            item.updateItem(userUid, dropId, dropCount, function (err, res) {
                if (err || res == null) {
                    callBack(err, null);
                } else {
                    callBack(null, res);
                }
            });
            break;
        case "17"://卡片
            var cardList = [];
            for (var i = 0; i < dropCount; i++) {
                cardList.push(dropId);
            }
            card.addCardList(userUid, cardList, function (err, res) {
                if (err) {
                    callBack(err, null);
                } else {
                    callBack(null, isReturnAll ? res : res[0]);
                }
            });
            break;
        default:
            if (dropId == "gold") {
                user.addUserData(userUid, "gold", dropCount, callBack);
            } else if (dropId == "ingot") {
                user.addUserData(userUid, "ingot", dropCount, callBack);
            } else if (dropId == "honor") {
                userVariable.getVariable(userUid, "honor", function (err, res) {
                    if (err)callBack(err);
                    else {
                        var val = 0;
                        if (res == null)  val = dropCount
                        else val = (res - 0) + dropCount;
                        userVariable.setVariable(userUid, "honor", val, function (err, res) {
                            if (err) callBack(err);
                            else callBack(null, {"honor": val})
                        });
                    }
                });
            } else if (dropId == "worldBossTeach") {
                var returnData = [];
                async.times(dropCount, function (n, cb) {
                    teach.addWorldBossTeach(userUid, level || 1, function (err, res) {
                        returnData.push(res);
                        cb(null);
                    });
                }, function (err, res) {
                    callBack(err, returnData);
                });
            } else if (dropId == "teach") {
                var returnData = [];
                var time = isPatch ? jutil.now() - 86400 : jutil.now();
                async.times(dropCount, function (n, cb) {
                    teach.addTeach(userUid, level || 1, time, function (err, res) {
                        returnData.push(res);
                        cb(null);
                    });
                }, function (err, res) {
                    callBack(err, returnData);
                });
            } else {
                callBack(null, null);
            }
            break;
    }
}

var propsTypeHash = {
    "skill": ["skill2", "skill3"],
    "equip": ["equip1", "equip2", "equip3"],
    "card": ["card1", "card2", "card3", "card4", "card5", "card6"]
};
/**
 * 如果此装备已被其它伙伴使用则移除它
 */
function removeRelated(userUid, propsUid, propsType, callbackFn) {
    formation.getUserFormation(userUid, function (err, res) {
        if (err) {
            callbackFn("dbError", null);
        } else {
            var formationData = res;
            var propsList = propsTypeHash[propsType];//["skill2","skill3","equip1","equip2","equip3","card1","card2","card3","card4","card5","card6"];
            var removeArray = [];
            for (var key in formationData) { //遍历所有编队成员
                var mItem = formationData[key];
                for (var i = 0; i < propsList.length; i++) {//遍历成员的所有（技能 装备 卡片）
                    var propsName = propsList[i];
                    if (mItem[propsName] == propsUid || ((propsUid instanceof Array == true) && (propsUid.indexOf(mItem[propsName] - 0) != -1))) {
                        removeArray.push([userUid, key, propsName]);
                    }
                }
            }
            async.forEach(removeArray, function (item, cb) {
                formation.removePropsFromFormation(item[0], item[1], item[2], function (err, res) {
                    cb();
                });
            }, function (err) {
                callbackFn(null, 1);
            });
        }
    });
}


exports.getData = getData;
exports.getUserData = getUserData;
exports.removeRelated = removeRelated;
exports.addDropItemToDB = addDropItemToDB;
exports.delData = delData;