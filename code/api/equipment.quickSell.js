/**
 * 装备-键出售（c级和b级）
 * User: za(在liyuluan的源代码上改版)
 * Date: 16-01-13
 * Time: 下午17:51
 */

var jutil = require("../utils/jutil");
var equipment = require("../model/equipment");
var configManager = require("../config/configManager");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var async = require("async");

/**
 * 参数：
 *      equipUids 装备ID列表
 * 返回：
 *      {"result":1,"gold":newUserGold,"sellGold":sellPrice}
 *      result: 1 成功
 *      gold: 玩家当前金币数
 *      sellGold: 总共买出的钱币数
 *
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    var userUid = query["userUid"];
    var equipUids = [];
    var configData = configManager.createConfig(userUid);
    var verifyEquipUids = []; //确认存在的装备列表
    var sellPrice = 0;//买出的价格
    var newUserGold = 0;//新的用户的金币数
    var euipConfig = configData.getConfig("equip");//装备的配置
    var star = 0;
    var level = 0;
    var kkk = [];
    async.series([
        function(cb) { //计算卖出的价格
            equipment.getEquipment(userUid,function(err,res) {
                if (err) cb("dbError");
                else {
                    kkk = Object.keys(res);
                    if(res == null || kkk.length <= 0){
                        cb("noEquip");
                    }else{
                        for(var xx in res){
                            star = euipConfig[res[xx]["equipmentId"]]["star"];
                            level = res[xx]["level"];
                            if(star <= 2 && level <= 1){
                                equipUids.push(xx);
                            }else{
                                continue;
                            }
                        }
                        for (var i = 0; i < equipUids.length; i++) {
                            var equipUid = equipUids[i];
                            var equipData = res[equipUid];
                            if (equipData != null) {
                                var equipLevel = equipData["level"] - 0;
                                var equipUpgradeRatioConfig = configData.getConfig("equipUpgradeRatio");//装备升级需要的金币配置
                                var equipConfig = configData.getConfig("equip");//装备配置
                                var mainConfig = configData.getConfig("main");
                                var equipItemConfig = equipConfig[equipData["equipmentId"]];//当前装备的配置
                                var basePrice = equipItemConfig["basePrice"] - 0;//强化需要的基础金币
                                var baseSellPrice = equipItemConfig["salePrice"] - 0;//1级装备出售金币
                                var upgradePrice = 0; //强化一共花费的金币数
                                for (var j = 1; j < equipLevel; j++) {
                                    upgradePrice += basePrice * (equipUpgradeRatioConfig[j] - 0);//需要花费的金币值
                                }
                                sellPrice += (baseSellPrice - 0) + (upgradePrice * (mainConfig["equipSaleRatio"] - 0));
                                verifyEquipUids.push(equipUid);
                            }
                            sellPrice = Math.floor(sellPrice);
                        }
                        if (verifyEquipUids.length > 0) {
                            cb(null,null);
                        } else {
                            cb("noEquip");
                        }
                    }
                }
            });
        },
        function(cb) { //取玩家的游戏币值
            user.getUser(userUid,function(err,res) {
                if (err || res == null) cb("dbError");
                else {
                    newUserGold = res["gold"] - 0 + sellPrice;
                    user.updateUser(userUid,{"gold":newUserGold},function(err,res) {
                        if (err) cb("dbError");
                        else {
                            cb(null,null);
                        }
                    });
                }
            });
        },
        function(cb) { //移除装备
            equipment.removeEquipment(userUid,verifyEquipUids,function(err,res) {
                cb(null,null);
                if (err) console.error("equipment.sell", userUid, verifyEquipUids, err.stack);
            });
        },
        function(cb) { //移除已装备的对象（如果已装备的话)
            modelUtil.removeRelated(userUid,verifyEquipUids,"equip",function(err,res) {
                cb(null,null);
            });
        }
    ],function(err,res) { //
        if (err) response.echo("equipment.quickSell",jutil.errorInfo(err));
        else {
            response.echo("equipment.quickSell",{"result":1,"gold":newUserGold,"sellGold":sellPrice});
        }
    });
}

exports.start = start;