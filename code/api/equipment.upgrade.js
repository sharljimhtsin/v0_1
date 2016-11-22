/**
 * 装备强化
 * User: liyuluan
 * Date: 13-10-15
 * Time: 下午5:32
 */

var jutil = require("../utils/jutil");
var equipment = require("../model/equipment");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var user = require("../model/user");
var gameModel = require("../model/gameModel");
var timeLimitActivityReward = require("../model/timeLimitActivityReward");
var achievement = require("../model/achievement");

function start(postData, response, query) {
    if (jutil.postCheck(postData,"equipUid") == false) {
        response.echo("equipment.upgrade",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var equipUid = postData["equipUid"];
    var configData = configManager.createConfig(userUid);

    equipment.getEquipment(userUid,function(err,res){
        if (err || res == null) {
            response.echo("equipment.upgrade",jutil.errorInfo("dbError"));
        } else {
            var equipmentItem = res[equipUid];//装备的数据
            if (equipmentItem == null) {
                response.echo("equipment.upgrade",jutil.errorInfo("propsNotExist"));
                return;
            }

            var equipmentId = equipmentItem["equipmentId"];//装备的ID
            var equipmentLevel = equipmentItem["level"] - 0;//装备的等级
            var equipUpgradeRatioConfig = configData.getConfig("equipUpgradeRatio");//装备升级需要的金币配置
            var equipConfig = configData.getConfig("equip");//装备配置
            var equipItemConfig = equipConfig[equipmentId];//当前装备的配置
            var basePrice = equipItemConfig["basePrice"] - 0;//强化需要的基础金币
            var price = basePrice * (equipUpgradeRatioConfig[equipmentLevel] - 0);//需要花费的金币值

            user.getUser(userUid,function(err,res) {
                if (err || res == null) {
                    response.echo("equipment.upgrade",jutil.errorInfo("dbError"));
                } else {
                    var gold = res["gold"] - 0;
                    var exp = res["exp"] - 0;
                    var vipLevel = res["vip"] - 0;

                    if (price > gold) {
                        response.echo("equipment.upgrade",jutil.errorInfo("noMoney"));
                    } else if (res["lv"] * 3 <= equipmentLevel  ) {
                        response.echo("equipment.upgrade",jutil.errorInfo("levelOverflow"));
                    } else {
                        var VIPPurview = configData.getVIPPurview(vipLevel);
                        var equipMaxUpgrade = VIPPurview["equipMaxUpgrade"] - 0;
                        var addLevel = Math.floor(Math.random() * equipMaxUpgrade) + 1;

                        if (addLevel >= 4 && res != null) { //
                            gameModel.addNews(userUid, gameModel.EQUIP_UPGRADE, res["userName"], equipmentId, addLevel);
                        }

                        var newLevel = equipmentLevel + addLevel;
                        equipment.updateEquipmentLevel(userUid,equipUid,newLevel,function(err,res) {
                            if (err) {
                                response.echo("equipment.upgrade",jutil.errorInfo("dbError"));
                            } else {
                                var userNewGold = gold - price;//用户当前拥有的金币
                                user.updateUser(userUid,{"gold":userNewGold},function(err,res) {
                                    if (equipItemConfig["star"] == 4) { // S装备
                                        achievement.equipLevelUp(userUid, newLevel, function(){});
                                    }

                                    timeLimitActivityReward.equipLevelUp(userUid, equipmentId, equipmentLevel, newLevel, function(){
                                        if (err) {
                                            response.echo("equipment.upgrade",{"result":1,"addLevel":addLevel,"newLevel":newLevel,"gold":gold});
                                        } else {
                                            response.echo("equipment.upgrade",{"result":1,"addLevel":addLevel,"newLevel":newLevel,"gold":userNewGold});
                                        }
                                    });
                                });//玩家扣钱处理
                            }
                        });//更新装备的新等级
                    }
                }
            });//取用户数据
        }
    });//取装备数据
}

exports.start = start;