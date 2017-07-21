/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-3-19
 * Time: 下午4:51
 * 一键强化
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var equipment = require("../model/equipment");
var configManager = require("../config/configManager");
var user = require("../model/user");
var async = require("async");
var timeLimitActivityReward = require("../model/timeLimitActivityReward");
var achievement = require("../model/achievement");
var yearCard = require("../model/yearCard");

function start(postData, response, query) {
    if (jutil.postCheck(postData,"equipUid") == false) {
        response.echo("equipment.oneTime",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var equipUid = postData["equipUid"];
    var configData = configManager.createConfig(userUid);
    var equipId = "";
    var equipLevel = 0;
    var userData;
    var newData;
    var addLevel = 0;
    var equipItemConfig = null;
    var newLevel = 0;
    async.series([
        function(cb){
            equipment.getEquipment(userUid,function(err,res){  //获取装备信息
                if (err || res == null) {
                    response.echo("equipment.oneTime",jutil.errorInfo("dbError"));
                } else {
                    var equipmentItem = res[equipUid];//装备的数据
                    if (equipmentItem == null) {
                        response.echo("equipment.oneTime",jutil.errorInfo("propsNotExist"));
                        return;
                    }
                    equipId = equipmentItem["equipmentId"];//装备的ID
                    equipLevel = equipmentItem["level"] - 0;//装备的等级
                    equipItemConfig = configData.getConfig("equip")[equipId];
                    cb(null,null);
                }
            });
        },
        function(cb){
            user.getUser(userUid,function(err,res) { //获取用户信息
                if (err || res == null) {
                    response.echo("equipment.oneTime", jutil.errorInfo("dbError"));
                    return;
                } else {
                    userData = res;
                    yearCard.isWork(userUid, function (isOk) {
                        if (userData["monthCard"] == "fifty") {
                            cb();
                        } else if (isOk) {
                            cb();
                        } else {
                            cb("monthCardOrYearCardEnough");
                        }
                    });
                }
            });
        },
        function(cb){
            equipment.getEquipmentUpgradeData(configData,equipId,equipLevel,userData,function(err,res){
                if(err){
                    response.echo("equipment.oneTime",jutil.errorInfo(err));
                }else{
                    newData = res;
                    addLevel = newData["level"] - equipLevel;
                    cb(null,null);
                }
            })
        },
        function(cb){ //更新装备信息
            newLevel = newData["level"];
            equipment.updateEquipmentLevel(userUid,equipUid,newLevel,function(err,res) {
                if (err) {
                    response.echo("equipment.oneTime",jutil.errorInfo("dbError"));
                } else {
                    timeLimitActivityReward.equipLevelUp(userUid, equipId, equipLevel, newLevel, function(){
                        cb(null,null);
                    });
                }
            });
        },
        function(cb) {
            if (equipItemConfig["star"] == 4) { // S装备
                achievement.equipLevelUp(userUid, newLevel, function(){
                    cb(null);
                });
            } else {
                cb(null);
            }
        },
        function(cb){//更新金币数量
            var needPrice = newData["price"];
            var newGold = userData["gold"] - needPrice;
            if(newGold < 0){
                response.echo("equipment.oneTime",jutil.errorInfo("noMoney"));
                return;
            }
            user.updateUser(userUid,{"gold":newGold},function(err,res) {
                if (err) {
                    response.echo("equipment.oneTime",{"result":1,"addLevel":addLevel,"newLevel":newData["level"],"gold":newGold});
                } else {
                    response.echo("equipment.oneTime",{"result":1,"addLevel":addLevel,"newLevel":newData["level"],"gold":newGold});
                }
                cb(null,null);
            });//玩家扣钱处理
        }
    ],function(err,res){
        if (err) {
            response.echo("equipment.oneTime",jutil.errorInfo(err));
        }
    });
}
exports.start = start;