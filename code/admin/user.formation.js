/**
 * user.formation 用户编队信息
 * User: joseppe
 * Date: 14-4-4
 * Time: 下午2:54
 */


var admin = require("../model/admin");
var hero = require("../model/hero");
var skill = require("../model/skill");
var card = require("../model/card");
var equipment = require("../model/equipment");
var jutil = require("../utils/jutil");
var formation = require("../model/formation");
var configManager = require("../config/configManager");
var async = require("async");



function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.formation", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.formation", jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfigFromCountry(query["country"]);
    admin.addOneOperationLog("userInfo",query,postData);
    var heroConfig = configData.getConfig("hero");
    var skillConfig = configData.getConfig("skill");
    var equipConfig = configData.getConfig("equip");
    var cardConfig = configData.getConfig("card");

    var userUid = postData["userUid"];
//    var country = query["country"];
    var datas = [];
    var heroData, skillData, cardData, equipmentData;

    async.series([
        function(callback){
            hero.getHero(userUid, function(err, res) {
                heroData = res;
                callback(null, null);
            });
        },
        function(callback){
            skill.getSkill(userUid, function(err, res) {
                skillData = res;
                callback(null, null);
            });
        },
        function(callback){
            equipment.getEquipment(userUid, function(err, res) {
                equipmentData = res;
                callback(null, null);
            });
        },
        function(callback){
            card.getCardList(userUid, function(err, res) {
                cardData = {};
                for(var i in res){
                    cardData[res[i]['cardUid']] = res[i];
                }
                callback(null, null);
             });
        },
        function(callback){
            formation.getUserFormation(userUid, function(err, res) {
                if (err || res == null){
                    callback("没有此用户", res);
                } else {
                    for (var i in res) {
                        var data = {
                            "formationUid": res[i].formationUid,
                            "hero": "",
                            "skill2": "",
                            "skill3": "",
                            "equip1": "",
                            "equip2": "",
                            "card1": "",
                            "card2": "",
                            "card3": "",
                            "card4": "",
                            "card5": "",
                            "card6": ""
                        };
                        if (res[i].heroUid != 0 && heroData[res[i].heroUid] != undefined)
                            data["hero"] = heroConfig[heroData[res[i].heroUid].heroId].name;
                        if (res[i].skill2 != 0 && skillData[res[i].skill2] != undefined)
                            data["skill2"] = skillConfig[skillData[res[i].skill2].skillId].name;
                        if (res[i].skill3 != 0 && skillData[res[i].skill3] != undefined)
                            data["skill3"] = skillConfig[skillData[res[i].skill3].skillId].name;
                        if (res[i].equip1 != 0 && equipmentData[res[i].equip1] != undefined)
                            data["equip1"] = equipConfig[equipmentData[res[i].equip1].equipmentId].name;
                        if (res[i].equip2 != 0 && equipmentData[res[i].equip2] != undefined)
                            data["equip2"] = equipConfig[equipmentData[res[i].equip2].equipmentId].name;
                        if (res[i].equip3 != 0 && equipmentData[res[i].equip3] != undefined)
                            data["equip3"] = equipConfig[equipmentData[res[i].equip3].equipmentId].name;
                        if (res[i].card1 != 0 && cardData[res[i].card1] != undefined)
                            data["card1"] = cardConfig[cardData[res[i].card1].cardId].name + cardData[res[i].card1].cardId;
                        if (res[i].card2 != 0 && cardData[res[i].card2] != undefined)
                            data["card2"] = cardConfig[cardData[res[i].card2].cardId].name + cardData[res[i].card2].cardId;
                        if (res[i].card3 != 0 && cardData[res[i].card3] != undefined)
                            data["card3"] = cardConfig[cardData[res[i].card3].cardId].name + cardData[res[i].card3].cardId;
                        if (res[i].card4 != 0 && cardData[res[i].card4] != undefined)
                            data["card4"] = cardConfig[cardData[res[i].card4].cardId].name + cardData[res[i].card4].cardId;
                        if (res[i].card5 != 0 && cardData[res[i].card5] != undefined)
                            data["card5"] = cardConfig[cardData[res[i].card5].cardId].name + cardData[res[i].card5].cardId;
                        if (res[i].card6 != 0 && cardData[res[i].card6] != undefined)
                            data["card6"] = cardConfig[cardData[res[i].card6].cardId].name + cardData[res[i].card6].cardId;
                        datas.push(data);
                    }
                    callback(null, null);
                }
            });
        }
    ],function(err, res){
        if (err || res == null){
            response.echo("user.formation", {"ERROR":"USER_ERROR","info":err});
        } else {
            response.echo("user.formation", datas);
        }
    });
}
exports.start = admin.adminAPIProxy(start);