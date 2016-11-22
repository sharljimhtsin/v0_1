/**
 * 宝石操作功能--gem.operation
 * User: za
 * Date: 15-03-06
 * Time: 上午12:00
 * 21级开启功能
 */

var equipment = require("../model/equipment");
var jutil = require("../utils/jutil");
var async = require("async");
var item = require("../model/item");
var ACTIVITY_CONFIG_NAME = "item";
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var user = require("../model/user");
function start(postData, response, query) {
    if (jutil.postCheck(postData, "action" ,"equipmentUid") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var equipmentUid = postData["equipmentUid"];//装备ID
    var equipmentData;
    var holeNo = 4;
    var holeindex = 0;//第几个孔
    var punId = "154801";//打孔石ID
    var configData = configManager.createConfig(userUid);
    var itemConfig = configData.getConfig("item");//取宝石配置
    var lvMin = configData.getConfig("main")["gem_open"];//取宝石配置
    var gemConfig = configData.getConfig("gem");//取宝石配置
    var returnData = {};//返回用户数据集合
    var inlayerGemId = "";//被卸下的宝石id
    switch(action){
        case "punch"://打孔
            async.series([function (cb) {
                user.getUser(userUid, function(err, res){
                    if(err || res == null){
                        cb("dbError");
                    } else if(res["lv"] < lvMin){
                        cb("lvNotEnough");
                    } else {
                        cb(null);
                    }
                })
            }, function (cb) {
                equipment.getEquipment(userUid,function(err,res) {//equipmentUid
                    for(var i in res){
                        if(res[i]["equipmentUid"] == equipmentUid){//检索装备
                            returnData["equipmentData"] = res[i];
                            break;
                        }
                    }
                    if(returnData["equipmentData"] == null){
                        cb("postError");
                    } else {
                        for(var j = 1;j<= holeNo;j++){
                            if(returnData["equipmentData"]["hole"+j] == "lock"){
                                returnData["equipmentData"]["hole"+j] = "unLock";
                                holeindex = j;
                                break;
                            }
                        }
                        if(holeindex == 0){
                            cb("postError");
                        } else {
                            cb(null);
                        }
                    }
                });
            }, function (cb) {
                item.getItem(userUid, punId,function(err,res){//取仓库里打孔石个数
                    if(err){
                        cb("dbError");
                    } else if(res == null || res["number"]-0 < gemConfig["punchCount"][holeindex]){
                        cb("punStoneNotEnough");
                    } else {
                        returnData["itemData"] = res;
                        cb(null);
                    }
                });
            }, function (cb) {
                returnData["itemData"]["number"] -= gemConfig["punchCount"][holeindex];
                mongoStats.expendStats(punId,userUid,"127.0.0.1",null,mongoStats.E_GEM,-gemConfig["punchCount"][holeindex]);//dropId, userUid, userIP, userInfo, statsId, count, level, type
                item.updateItem(userUid,punId,-gemConfig["punchCount"][holeindex],cb);
            }, function (cb) {
                equipment.updateEquipment(userUid,equipmentUid,returnData["equipmentData"],cb);
            }],function(err,res){
                echo(err,returnData);//{"itemData":holeData}
            });
            break;
        case "inlay"://镶嵌
            /***
             * 镶嵌--1.替换字段 2.同一类型的宝石只能镶嵌一个（条件）；
             * 153701--一级攻击宝石，（37）--类型，（01）--等级
             */
            if (jutil.postCheck(postData,"holeindex","itemId") == false) {
                echo("postError");
                return false;
            }
            holeindex = postData["holeindex"];//第几个孔
            var itemId = postData["itemId"]//宝石测试id:"153701"
            var itemType = itemConfig[itemId]["itemType"];
            if (itemConfig[itemId] == null || gemArr.indexOf(itemType) == -1) {//类型判断
                echo("itemInvalid");
                return;
            }
            async.series([function (cb) {
                user.getUser(userUid, function(err, res){
                    if(err || res == null){
                        cb("dbError");
                    } else if(res["lv"] < lvMin){
                        cb("lvNotEnough");
                    } else {
                        cb(null);
                    }
                })
            }, function (cb) {
                item.getItem(userUid,itemId,function(err,res){//取仓库里宝石个数
                    if(err){
                        cb("dbError");
                    }else if(res == null || res["number"]-0 < 1){
                        cb("gemNotEnough");
                    } else{
                        cb(null);
                    }
                });
            }, function (cb) {
                //取数据
                equipment.getEquipment(userUid,function(err,res) {//equipmentUid
                    for(var i in res){
                        if(res[i]["equipmentUid"] == equipmentUid){//检索装备
                            returnData["equipmentData"] = res[i];
                            break;
                        }
                    }
                    if(returnData["equipmentData"] == null || returnData["equipmentData"]["hole"+holeindex] == "lock"){
                        cb("postError");
                    } else {
                        if(returnData["equipmentData"]["hole"+holeindex] == "unLock"){//镶嵌 仓库扣宝石
                            cb(null);
                        }else{//替换 仓库扣宝石+返还卸下的宝石
                            if (itemConfig[returnData["equipmentData"]["hole"+holeindex]]["itemType"] == itemType || returnData["equipmentData"]["hole"+holeindex] == itemId){
                                cb("typeError");
                            }else{
                                inlayerGemId = returnData["equipmentData"]["hole"+holeindex];
                                item.updateItem(userUid, inlayerGemId, 1, function(err, res){//返还被卸下的宝石进仓库
                                    returnData["inlayerItemData"] = res;
                                    cb(err, res);
                                });
                            }
                        }
                    }
                });
            },function (cb) {
                mongoStats.expendStats(itemId,userUid,"127.0.0.1",null,mongoStats.E_GEM,1);//dropId, userUid, userIP, userInfo, statsId, count, level, type
                item.updateItem(userUid, itemId, -1, function(err, res){
                    returnData["itemData"] = res;
                    cb(err, res);
                });//扣除仓库中的宝石
            },function(cb){
                returnData["equipmentData"]["hole"+holeindex] = itemId;
                equipment.updateEquipment(userUid, equipmentUid, returnData["equipmentData"] ,cb);
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "remove"://卸下
            /***
             * 1.拆卸--替换字段 替换为：unLock
             * 153701--一级攻击宝石，（37）--类型，（01）--等级
             * 2.替换--更新字段名为给到的字段（前端）；
             */
            if (jutil.postCheck(postData,"holeindex") == false) {
                echo("postError");
                return false;
            }
            holeindex = postData["holeindex"];//第几个孔
            async.series([function(cb){//取玩家的:1.等级，2.金币
                user.getUser(userUid, function(err ,res){
                    if(err || res == null){
                        cb("dbError");
                    } else if(res["lv"] < lvMin){
                        cb("lvNotEnough");
                    }else{
                        cb(null);
                    }
                });
            },function (cb) {
                //取数据
                equipment.getEquipment(userUid, function(err,res) {//equipmentUid
                    for(var k in res){
                        if(res[k]["equipmentUid"] == equipmentUid){
                            returnData["equipmentData"] = res[k];
                            break;
                        }
                    }
                    if(returnData["equipmentData"] == null || returnData["equipmentData"]["hole"+holeindex] == undefined || returnData["equipmentData"]["hole"+holeindex] == "lock" || returnData["equipmentData"]["hole"+holeindex] == "unLock"){
                        cb("postError");
                    } else {
                        cb(null);
                    }
                });
            },function (cb) {
                mongoStats.dropStats(returnData["equipmentData"]["hole"+holeindex], userUid, "127.0.0.1", null, mongoStats.E_GEM, 1);//dropId, userUid, userIP, userInfo, statsId, count, level, type
                item.updateItem(userUid, returnData["equipmentData"]["hole"+holeindex], 1, function(err, res){
                    returnData["itemData"] = res;
                    cb(err, res);
                });
            }, function (cb) {
                returnData["equipmentData"]["hole"+holeindex] = "unLock";
                equipment.updateEquipment(userUid, equipmentUid, returnData["equipmentData"], cb);
            }],function(err,res){
                echo(err,returnData);
            });
            break;
    }
    function echo(err, res){
        if(err){
            response.echo("gem.operation", jutil.errorInfo(err));
        } else{
            response.echo("gem.operation",res);
        }
    }
}

var gemArr = [37,38,39,40,41,42,43,44,45,46];
exports.start = start;