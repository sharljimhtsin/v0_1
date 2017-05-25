/**
 * Created by joseppe on 2015/4/17 14:52.
 *
 * 聚宝盆
 */

var async = require("async");
var redis = require("../alien/db/redis");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var skill = require("../model/skill");
var equipment = require("../model/equipment");
var item = require("../model/item");
var card = require("../model/card");
var heroSoul = require("../model/heroSoul");
var jutil = require("../utils/jutil");
var ACTIVITY_CONFIG_NAME = "forge";

function getConfig(userUid,callbackFn){
    activityConfig.getConfig(userUid, ACTIVITY_CONFIG_NAME, function(err,res){
        if(err || res ==null)callbackFn("CannotgetConfig");
        else{
            if(res[0]){
                var sTime = res[4];
                var eTime = res[5];
                var currentConfig = res[2];
                callbackFn(null, [sTime, eTime, currentConfig]);
            }else{
                callbackFn("notOpen");
            }
        }
    });
}

function getUserData(userUid, sTime, callbackFn) {
    activityData.getActivityData(userUid, activityData.PRACTICE_FORGE, function(err, res){
        var userData = {"data":0, "dataTime":sTime, "status":0, "statusTime":0,"arg":{}};
        if(res != null && res["dataTime"] == sTime){
            if(err){
                callbackFn(err);
            } else {
                userData = res;
                redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).getObj(function(err, res){
                    userData["arg"] = res;
                    if(res == null)
                        userData["arg"] = {};
                    callbackFn(err, userData);
                });
            }
        } else {
            callbackFn(null, userData);
        }
    });
}

function checkItem(userUid, itemList, callbackFn) {
    if(itemList.length <= 0){
        callbackFn("postError");
        return;
    }
    async.eachSeries(itemList, function(itemData, esCb){
        var error = "postError";
        var type = getTypeOfId(itemData["id"]+"");
        var itemUids = [];
        switch (type) {
            case "11"://skill
                skill.getSkill(userUid, function(err, res){
                    if(!err && res != null){
                        error = null;
                        for(var i in res){
                            if(res[i]["skillId"] == itemData["id"]){
                                itemUids.push(res[i]["skillUid"]);
                            }
                        }
                        for(var i in itemData["itemUid"]){
                            if(itemUids.indexOf(itemData["itemUid"][i]) == -1){
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
                equipment.getEquipment(userUid, function(err, res){
                    if(!err && res != null){
                        error = null;
                        for(var i in res){
                            if(type == 'equip' || res[i]["equipmentId"] == itemData["id"]){
                                itemUids.push(res[i]["equipmentUid"]);
                            }
                        }
                        for(var i in itemData["itemUid"]){
                            if(itemUids.indexOf(itemData["itemUid"][i]) == -1){
                                error = "postError";
                            }
                        }
                    }
                    esCb(error);
                });
                break;
            case "15"://item
                item.getItem(userUid, itemData["id"], function(err, res){
                    if(!err && res != null && res["number"] - itemData["count"] >= 0){
                        error = null;
                    }
                    esCb(error);
                });
                break;
            case "17"://卡片
                card.getCardList(userUid, function(err, res){
                    if(!err && res != null){
                        error = null;
                        for(var i in res){
                            if(res[i]["cardId"] == itemData["id"]){
                                itemUids.push(res[i]["cardUid"]);
                            }
                        }
                        for(var i in itemData["itemUid"]){
                            if(itemUids.indexOf(itemData["itemUid"][i]) == -1){
                                error = "postError";
                                break;
                            }
                        }
                    }
                    esCb(error);
                });
                break;
            case "10":
                heroSoul.getHeroSoulItem(userUid, itemData["id"], function (err, res) {
                    if (!err && res != null && res["count"] - itemData["count"] >= 0) {
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
    async.eachSeries(itemList, function(itemData, esCb){
        var type = getTypeOfId(itemData["id"]+"");
        switch (type) {
            case "11"://skill
                async.eachSeries(itemData["itemUid"], function(itemUid, essCb){
                    skill.removeSkill(userUid, itemUid, essCb);
                }, esCb);
                break;
            case 'equip':
            case "12"://装备
            case "13"://装备
            case "14"://装备
                async.eachSeries(itemData["itemUid"], function(itemUid, essCb){
                    equipment.removeEquipment(userUid, itemUid, essCb);
                }, esCb);
                break;
            case "15"://item
                item.updateItem(userUid, itemData["id"], -itemData["count"], esCb);
                break;
            case "17"://卡片
                card.delCard(userUid, itemData["itemUid"], esCb);
                break;
            case "10":
                heroSoul.delHeroSoulItem(userUid, itemData["id"], itemData["count"], esCb);
                break;
            default :
                esCb("postError");
                break;
        }
    }, callbackFn);
}

function setUserData(userUid, userData, callbackFn) {
    var arg = userData["arg"];
    delete userData["arg"];
    activityData.updateActivityData(userUid, activityData.PRACTICE_FORGE, userData, function(err, res){
        redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).setObj(arg, callbackFn);
        redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).expire(userData["statusTime"] - jutil.now());
    });
}

function getTypeOfId(itemId){
    if(itemId == 'equip'){
        return 'equip';
    } else {
        return itemId.substr(0,2);
    }
}

exports.getConfig = getConfig;
exports.getUserData = getUserData;
exports.checkItem = checkItem;
exports.processItem = processItem;
exports.setUserData = setUserData;