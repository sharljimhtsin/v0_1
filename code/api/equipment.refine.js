/**
 * 装备精炼
 * User: liyuluan
 * Date: 13-11-5
 * Time: 下午12:55
 */

var jutil = require("../utils/jutil");
var equipment = require("../model/equipment");
var itemModel = require("../model/item");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var async = require("async");

var timeLimitActivityReward = require("../model/timeLimitActivityReward");
var achievement = require("../model/achievement");


/**
 * @param postData equipUid 装备UID itemList 被精炼的道具列表 [[itemId,count],[itemId,count]]
 * @param response {"itemList":resultItemList,"equip":resultEquipData} itemList:为 变动的item的当前数据， equip:精炼装备的当前数据
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData,"equipUid","itemList") == false) {
        response.echo("equipment.refine",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var equipUid = postData["equipUid"];
    var itemList = postData["itemList"];
    if ((itemList instanceof Array) == false) {
        response.echo("equipment.refine",jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfig(userUid);

    var equipConfig = configData.getConfig("equip");
    var itemConfig = configData.getConfig("item");

    var equipType = null;//装备类别
    var equipStar = null;//装备星级
    var equipData = null;//装备数据
    var needItemType = null;//精炼材料ID

    var delItemList = [];//需要删除的item
    var refineValue = 0;//累加的精炼值

    var resultItemList = [];
    var resultEquipData = null;

    var equipId = 0; // 装备ID
    var oldRefiningLevel = 0; // 当前精炼等级
    var newRefiningLevel = 0; // 新的精炼等级

    async.series([
        function(cb) {//取当前装备信息
            equipment.getEquipment(userUid,function(err,res) {
                if (err) cb("dbError",null);
                else if(res == null || res[equipUid] == null) cb("noEquip",null);
                else {
                    equipData = res[equipUid];//当前的装备数据
                    oldRefiningLevel = equipData["refiningLevel"];
                    equipId = equipData["equipmentId"];
                    var cEquipmentId  = equipData["equipmentId"];//当前的装备ID
                    var cEquipConfig = equipConfig[cEquipmentId];//当前装备的配置
                    equipStar = cEquipConfig["star"];
                    equipType = cEquipConfig["type"];//装备类别
                    needItemType = getNeedItemType(equipType);//取得当前的装备精炼需要的精炼材料ID
                    if (equipStar != 3 && equipStar != 4) cb("noRefine",null);
                    else cb(null,null);
                }
            });
        },
        function(cb) { //计算精炼材料的累加值和判断是否有效
            async.forEach(itemList,function(item,forcb) {
                var itemId = item[0];
                var itemCount = item[1] - 0;
                var cItemConfig = itemConfig[itemId];//当前道具配置
                if (cItemConfig != null && cItemConfig["itemType"] == needItemType) {
                    itemModel.getItem(userUid,itemId,function(err,res) {
                        if (err == null && res != null && res["number"] - 0 >= itemCount) {
                            delItemList.push(item);
                            var cItemTypeValue = cItemConfig["typeValue"] - 0;
                            refineValue += (cItemTypeValue * itemCount);
                            forcb(null);
                        } else {
                            forcb(null);
                        }
                    });
                } else {
                    forcb(null);
                }
            },function(err,res) {
                cb(null,null);
            });
        },
        function(cb) { //加精炼值
            var newRefining = equipData["refining"] - 0 + refineValue;//新的精炼值
            newRefiningLevel = refiningToLevel(configData, newRefining, equipStar);
            equipment.updateEquipmentRefining(userUid,equipUid,newRefining,newRefiningLevel,function(err,res) {
                if (err) cb("dbError",null);
                else {
                    resultEquipData = {};
                    resultEquipData["userUid"] = userUid;
                    resultEquipData["equipmentUid"] = equipData["equipmentUid"];
                    resultEquipData["level"] = equipData["level"];
                    resultEquipData["refining"] = newRefining;
                    resultEquipData["refiningLevel"] = newRefiningLevel;
                    cb(null,null);
                }
            });
        },
        function(cb) { //移除精炼材料
            async.forEach(delItemList,function(item,forcb) {
                var mItemId = item[0];
                var mItemCount = item[1];
                itemModel.updateItem(userUid,mItemId,-mItemCount,function(err,res) {
                    if (err) {
                        forcb(null,null);
                        console.error(err.stack);
                    } else {
                        resultItemList.push(res);
                        forcb(null,null);
                    }
                });
            },function(err,res) {
                cb(null,null);
            });
        }
    ],function(err,res) {
        if (err) response.echo("equipment.refine",jutil.errorInfo(err));
        else {
            if (equipStar == 4) { // S 装备
                achievement.equipRefine(userUid, newRefiningLevel, function(){});
            }

            if (oldRefiningLevel != newRefiningLevel) {
                timeLimitActivityReward.equipUpdate(userUid, equipId, oldRefiningLevel, newRefiningLevel, function(){
                    response.echo("equipment.refine",{"itemList":resultItemList,"equip":resultEquipData});
                });
            } else {
                response.echo("equipment.refine",{"itemList":resultItemList,"equip":resultEquipData});
            }
        }
    });
}

function getNeedItemType(equipType) {
    if (equipType == 12) return 5;
    else if (equipType == 13) return 6;
    else if (equipType == 14) return 7;
    else return 999;
}


function refiningToLevel(configData, refineValue,star) {
    var mainConfig = configData.getConfig("main");
    var refineNeedExp = mainConfig["refineNeedExp"];
    var cRefineNeedExp = refineNeedExp[star]["needExp"];
    for (var i = 0; i < 10; i++) {
        if (refineValue < cRefineNeedExp[i] - 0) return i;
    }
    return 0;
}


exports.start = start;