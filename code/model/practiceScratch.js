/**
 * Created by za on 2015/5/22 15:48 礼拜五
 * 刮刮乐--翻格子 practiceScratch
 */

var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var ACTIVITY_CONFIG_NAME = "scratch";
var async = require("async");
var skill = require("../model/skill");
var equipment = require("../model/equipment");
var item = require("../model/item");
var card = require("../model/card");
var heroSoul = require("../model/heroSoul");

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
//获取用户当前数据
function getUserData(userUid, sTime, init, isGhost,callbackFn){
    var returnData = {"ingot":0, "dataTime":0, "resetTimes":0, "statusTime":0, "arg":{}};
    var currentConfig;
    var rewardLength = 0;
    var minLimit = 0;//小图上限
    var minList;
    var mapList;
    var mapId = 0 ;//大图
    var ghostPay = 0;//一键刮开价格
    var exchange;//聚宝盆数据
    var isNew = true;
    async.series([function(cb) {
        getConfig(userUid, function(err, res){
            sTime = res[0];
            returnData["dataTime"] = sTime;
            currentConfig = res[2];
            rewardLength = currentConfig["rewardList"].length;
            currentConfig["minLimit"] = currentConfig["minLimit"] > rewardLength?rewardLength:currentConfig["minLimit"];
            mapList = currentConfig["mapList"];
            cb(null);
        });
    }, function(cb){
        activityData.getActivityData(userUid, activityData.PRACTICE_SCRATCH, function(err, res){
            if(res != null && res["dataTime"] == sTime){
                returnData["ingot"] = res["data"] -0;
                returnData["resetTimes"] = res["status"] -0;//今天重置次数
                returnData["dataTime"] = res["dataTime"] -0;
                returnData["statusTime"] = res["statusTime"] -0;
                isNew = false;
            }
            cb(err);
        });
    }, function(cb){
        redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).getObj(function(err, res){
            var h = Math.floor(Math.random() * mapList.length);
            if(isNew || init || isGhost){
                var arg = {};
                arg["allTimes"] = jutil.compTimeDay(jutil.now(), returnData["statusTime"]) && res != null?res["allTimes"]:0;
                arg["ghostPay"] = ghostPay;
                arg["mapId"] = mapList[h];
                arg["minList"] = [];
                arg["exchange"] = (!isNew && res && res.hasOwnProperty("exchange")) ? res["exchange"] : {};

                var length = currentConfig["rewardList"].length;
                var rewardList = jutil.deepCopy(currentConfig["rewardList"]);
                var temp = [];
                for(var i = 0; i < length; i++){
                    temp.push(i);
                }
                while(arg["minList"].length < currentConfig["minLimit"]){
                    var r = Math.floor(Math.random()*temp.length);
                    arg["minList"].push({"id":temp[r], "status":0});
                    temp.splice(r, 1);
                }
                returnData["arg"] = arg;
                redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).setObjex(86400, arg, cb);
            }else{
                returnData["arg"] = res;
                cb(err);
                //redis与mysql整合
//                console.log(res,"242423");
//                if(res == null){
//                    activityData.getActivityData(userUid,ACTIVITY_CONFIG_NAME,function(err,res){
//                        var obj;
//                        if (res["arg"] == "") {
//                            obj = null;
//                        } else {
//                            try {
//                                var jsonObj = JSON.parse(res["arg"]);
//                            } catch (e) {
//                                jsonObj = null;
//                            } finally {
//                                obj = jsonObj;
//                            }
//                        }
//                        returnData["arg"] = obj;
//                        cb(err, obj);
//                    });
//                }else{
//                    returnData["arg"] = res["arg"];
//                    cb(err,returnData["arg"]);
//                }
            }
        });
    }, function(cb){
        if(!jutil.compTimeDay(jutil.now(), returnData["statusTime"])){//过凌晨清次数
            returnData["statusTime"] = jutil.now();
            returnData["arg"]["allTimes"] = 0;//今天已使用免费次数
            returnData["resetTimes"] = 0;//今天重置次数
            cb(null);
        } else {
            cb(null);
        }
    }], function(err, res){
        callbackFn(err, returnData);
    });
}
//设置用户当前数据--加入了聚宝盆部分代码
function setUserData(userUid, data, callbackFn){
//    var dArg = JSON.stringify(data["arg"]);
    var redisData = data["arg"];
    var dbData = {"data":data["ingot"], "dataTime":data["dataTime"], "status":data["resetTimes"], "statusTime":data["statusTime"],"arg":""};//dArg
    redis.user(userUid).s("practice:"+ACTIVITY_CONFIG_NAME).setObj(redisData, function(err, res){//验证活动过期时间
        activityData.updateActivityData(userUid, activityData.PRACTICE_SCRATCH, dbData, callbackFn);
    });
}
//验证道具--聚宝盆
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
//合成道具--聚宝盆
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
//根据id取类型--聚宝盆
function getTypeOfId(itemId){
    if(itemId == 'equip'){
        return 'equip';
    } else {
        return itemId.substr(0,2);
    }
}
exports.getConfig = getConfig;
exports.getUserData = getUserData;
exports.setUserData = setUserData;
exports.checkItem = checkItem;
exports.processItem = processItem;