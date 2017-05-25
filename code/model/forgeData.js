/**
 * Created by xiazhengxin on 2015/1/26 13:43.
 *
 * 锻造系统数据模型层
 */

var async = require("async");
var modelUtil = require("../model/modelUtil");
var heroSoul = require("../model/heroSoul");
var hero = require("../model/hero");
var debris = require("../model/debris");
var skill = require("../model/skill");
var equipment = require("../model/equipment");
var item = require("../model/item");
var card = require("../model/card");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var teach = require("../model/teach");
var formation = require("../model/formation");

function checkForgeElement(userUid, items, callbackFn) {
    async.eachSeries(items, function (item, cb) {
        var type = getTypeFromId(item["id"]);
        if (typeof type == "object" || type == null) {
            type = item["type"];
        }
        getItemCount(userUid, item["id"], type, function (err, res) {
            if (err) {
                cb(err);
            } else if (res >= parseInt(item["count"])) {
                cb();
            } else {
                cb("not enough");
            }
        });
    }, function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            callbackFn();
        }
    });
}

function getTypeFromId(id) {
    switch (id.substr(0, 2)) {
        case "10"://hero 魂魄
            return ["hero", "heroSoul"];
            break;
        case "11"://skill 技能  或者技能碎片
            return ["skill", "debris"];
            break;
        case "12"://装备
        case "13"://装备
        case "14"://装备
            return "equipment";
            break;
        case "15"://item
            return "item";
            break;
        case "17"://卡片
            return "card";
            break;
        case "44"://S级装备
            return "s";
            break;
        default:
            if (id == "gold") {
                return id;
            } else if (id == "ingot") {
                return id;
            } else if (id == "honor") {
                return id;
            } else if (id == "worldBossTeach") {
                return id;
            } else if (id == "teach") {
                return id;
            } else {
                return null;
            }
            break;
    }
}

function checkExist(itemId, itemUid, key, list, cb, needReturn) {
    var ret = [];
    for (var value in list) {
        value = list[value];
        if (value[key] == itemId) {
            ret.push(value[itemUid]);
        }
    }
    cb(null, needReturn ? ret : ret.length);
}

function checkExistForEquip(userUid, itemId, itemUid, key, list, cb, needReturn) {
    var l = [];
    for (var v in list) {
        l.push(list[v]);
    }
    var ret = [];
    async.eachSeries(l, function (item, cbb) {
        if (item[key] == itemId) {
            var uid = item[itemUid];
            formation.getEquipInFormation(userUid, uid, function (err, res) {
                if (err) {
                    cbb(null);
                } else if (res != null && res.length > 0) {
                    cbb(null);
                } else {
                    ret.push(uid);
                    cbb(null);
                }
            });
        } else {
            cbb(null);
        }
    }, function (err, res) {
        if (err) {
            cb(null, 0);
        } else {
            cb(null, needReturn ? ret : ret.length);
        }
    });
}

function checkExistForSkill(userUid, itemId, itemUid, key, list, cb, needReturn) {
    var l = [];
    for (var v in list) {
        l.push(list[v]);
    }
    var ret = [];
    async.eachSeries(l, function (item, cbb) {
        if (item[key] == itemId) {
            var uid = item[itemUid];
            formation.getSkillInFormation(userUid, uid, function (err, res) {
                if (err) {
                    cbb(null);
                } else if (res != null && res.length > 0) {
                    cbb(null);
                } else {
                    ret.push(uid);
                    cbb(null);
                }
            });
        } else {
            cbb(null);
        }
    }, function (err, res) {
        if (err) {
            cb(null, 0);
        } else {
            cb(null, needReturn ? ret : ret.length);
        }
    });
}

function checkExistForCard(userUid, itemId, itemUid, key, list, cb, needReturn) {
    var l = [];
    for (var v in list) {
        l.push(list[v]);
    }
    var ret = [];
    async.eachSeries(l, function (item, cbb) {
        if (item[key] == itemId) {
            var uid = item[itemUid];
            formation.getCardInFormation(userUid, uid, function (err, res) {
                if (err) {
                    cbb(null);
                } else if (res != null && res.length > 0) {
                    cbb(null);
                } else {
                    ret.push(uid);
                    cbb(null);
                }
            });
        } else {
            cbb(null);
        }
    }, function (err, res) {
        if (err) {
            cb(null, 0);
        } else {
            cb(null, needReturn ? ret : ret.length);
        }
    });
}

function getItemCount(userUid, itemId, itemType, callbackFn, needReturn) {
    switch (itemType) {
        case "heroSoul":
            heroSoul.getHeroSoulItem(userUid, itemId, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else if (res == null) {
                    callbackFn(null, 0);
                } else {
                    callbackFn(null, res["count"]);
                }
            });
            break;
        case "hero":
            hero.getHero(userUid, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else if (res == null) {
                    callbackFn(null, 0);
                } else {
                    checkExist(userUid, itemId, "heroUid", "heroId", res, callbackFn, needReturn);
                }
            });
            break;
        case "debris":
            debris.getDebrisItem(userUid, itemId, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else {
                    callbackFn(null, 1);
                }
            });
            break;
        case "skill":
            skill.getSkill(userUid, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else if (res == null) {
                    callbackFn(null, 0);
                } else {
                    checkExistForSkill(userUid, itemId, "skillUid", "skillId", res, callbackFn, needReturn);
                }
            });
            break;
        case "equipment":
            equipment.getEquipment(userUid, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else if (res == null) {
                    callbackFn(null, 0);
                } else {
                    checkExistForEquip(userUid, itemId, "equipmentUid", "equipmentId", res, callbackFn, needReturn);
                }
            });
            break;
        case "item":
            item.getItem(userUid, itemId, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else if (res == null) {
                    callbackFn(null, 0);
                } else {
                    callbackFn(null, res["number"]);
                }
            });
            break;
        case "card":
            card.getCardList(userUid, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else if (res == null) {
                    callbackFn(null, 0);
                } else {
                    checkExistForCard(userUid, itemId, "cardUid", "cardId", res, callbackFn, needReturn);
                }
            });
            break;
        case "gold":
            user.getUserDataFiled(userUid, "gold", function (err, res) {
                if (err) {
                    callbackFn(err);
                } else {
                    callbackFn(null, res);
                }
            });
            break;
        case "ingot":
            user.getUserDataFiled(userUid, "ingot", function (err, res) {
                if (err) {
                    callbackFn(err);
                } else {
                    callbackFn(null, res);
                }
            });
            break;
        case "honor":
            userVariable.getVariable(userUid, "honor", function (err, res) {
                if (err) {
                    callbackFn(err);
                } else {
                    callbackFn(null, res);
                }
            });
            break;
        case "worldBossTeach":
            teach.getWorldBossTeachList(userUid, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else if (res == null) {
                    callbackFn(null, 0);
                } else {
                    checkExist(userUid, itemId, "teachUid", "teachId", res, callbackFn, needReturn);
                }
            });
            break;
        case "teach":
            teach.getTeachList(userUid, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else if (res == null) {
                    callbackFn(null, 0);
                } else {
                    checkExist(userUid, itemId, "teachUid", "teachId", res, callbackFn, needReturn);
                }
            });
            break;
        default :
            callbackFn();
            break;
    }
}

function expendItem(userUid, itemId, itemType, itemCount, callbackFn) {
    var type = getTypeFromId(itemId);
    if (typeof type == "object" || type == null) {
        type = itemType;
    }
    var itemUid;
    async.series([function (cb) {
        getItemCount(userUid, itemId, itemType, function (err, res) {
            itemUid = res;
            cb(err);
        }, true);
    }, function (cb) {
        if (itemUid != null && typeof itemUid == "object" && itemUid.length > itemCount) {
            itemUid = itemUid.slice(0, itemCount);
        }
        cb();
    }], function (err, res) {
        switch (type) {
            case "heroSoul":
                heroSoul.delHeroSoulItem(userUid, itemId, itemCount, function (err, res) {
                    callbackFn(err, {"number": res, "userUid": userUid, "heroId": itemId});
                });
                break;
            case "hero":
                async.eachSeries(itemUid, function (uid, cb) {
                    hero.removeHero(userUid, uid, function (err, res) {
                        cb(null);
                    });
                }, function (err, res) {
                    callbackFn(err, {"number": 0, "userUid": userUid, "heroId": itemId, "itemUid": itemUid});
                });
                break;
            case "debris":
                debris.removeSkillPatch(userUid, itemId, function (err, res) {
                    callbackFn(err, {"number": 0, "userUid": userUid, "skillId": itemId});
                });
                break;
            case "skill":
                async.eachSeries(itemUid, function (uid, cb) {
                    skill.removeSkill(userUid, uid, function (err, res) {
                        cb(null);
                    });
                }, function (err, res) {
                    callbackFn(err, {"number": 0, "userUid": userUid, "skillId": itemId, "itemUid": itemUid});
                });
                break;
            case "equipment":
                async.eachSeries(itemUid, function (uid, cb) {
                    equipment.removeEquipment(userUid, uid, function (err, res) {
                        cb(null);
                    });
                }, function (err, res) {
                    callbackFn(err, {"number": 0, "userUid": userUid, "equipmentId": itemId, "itemUid": itemUid});
                });
                break;
            case "item":
                item.updateItem(userUid, itemId, itemCount * -1, callbackFn);
                break;
            case "card":
                card.delCard(userUid, [itemUid], function (err, res) {
                    callbackFn(err, {"number": 0, "userUid": userUid, "cardId": itemId, "itemUid": itemUid});
                });
                break;
            case "gold":
                user.addUserData(userUid, "gold", itemCount * -1, callbackFn);
                break;
            case "ingot":
                user.addUserData(userUid, "ingot", itemCount * -1, callbackFn);
                break;
            case "honor":
                userVariable.setVariable(userUid, "honor", itemCount * -1, function (err, res) {
                    callbackFn(err, {"number": 0, "userUid": userUid, "itemId": itemId});
                });
                break;
            case "worldBossTeach":
                async.eachSeries(itemUid, function (uid, cb) {
                    teach.delWorldBossTeach(userUid, uid, function (err, res) {
                        cb(null);
                    });
                }, function (err, res) {
                    callbackFn(err, {"number": 0, "userUid": userUid, "teachUid": itemId, "itemUid": itemUid});
                });
                break;
            case "teach":
                async.eachSeries(itemUid, function (uid, cb) {
                    teach.delTeach(userUid, uid, function (err, res) {
                        cb(null);
                    });
                }, function (err, res) {
                    callbackFn(err, {"number": 0, "userUid": userUid, "teachUid": itemId, "itemUid": itemUid});
                });
                break;
            default :
                callbackFn();
                break;
        }
    });
}

exports.checkForgeElement = checkForgeElement;
exports.expendItem = expendItem;