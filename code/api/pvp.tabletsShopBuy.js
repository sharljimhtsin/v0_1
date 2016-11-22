/**
 * 神位争夺（跨服战）宇宙商店 - 购买
 * User: peter.wang
 * Date: 14-11-21
 * Time: 上午10:50
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var modelUtil = require("../model/modelUtil");
var item = require("../model/item");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var userVariable = require("../model/userVariable");
var gsData = require("../model/gsData");
var gsTabletsUser = require("../model/gsTabletsUser");
var stats = require("../model/stats");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "cellId","buyId") == false) {
        response.echo("pvp.tabletsShopBuy", jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var cellId = postData["cellId"];//cellId值从1开始
    var buyId = postData["buyId"];

    var configData  = configManager.createConfig(userUid);

    var issueId = 0;
    var activityConfig = {};
    var returnValue = {};
    async.series([
        function(cb){// 开服时间条件
            gsTabletsUser.checkUserServerStatus(userUid, function (err, res) {
                if (err) cb(err);
                else if (res == 0) cb("postError");
                else {
                    cb(null);
                }
            });
        },
        function(cb){// 是否活动中
            gsData.getCurIssueId(userUid, gsData.GS_TABLETSCOMPETE, function (err, res) {
                if (err) cb(err);
                else if (res == 0) cb("gpActivityEnd");
                else {
                    issueId = res;
                    cb(null);
                }
            });
        },
        function(cb){ // 活动配制
            gsData.getActivityConfig(userUid,gsData.GS_TABLETSCOMPETE,function(err,res){
                activityConfig = res[2];
                cb(null);
            })
        },
        function(cb) { // 是否有购买过
            redis.user(userUid).h(gsTabletsUser.getGSRedisKey(issueId, "buyGoodsLog")).get(cellId,function(err,res){
                if(err) cb(err);
                else if(res==null) cb(null);
                else cb("postError");//已经购买过
            })
        },
        function(cb){// 购买
            redis.user(userUid).s(gsTabletsUser.getGSRedisKey(issueId, "shopGoods")).getObj(function (err, res) {
                if (err) cb(err);
                else if (res==null || res[cellId]==null) cb("postError1");
                else {
                    var buyItem = res[cellId];
                    if(buyItem["id"]!=buyId){//请求已过期
                        cb("postError2")
                    }else {
                        checkCostIsEnough(userUid, buyItem["costType"], buyItem["cost"], function (err, res) {
                            if (err) cb(err);
                            else {
                                var itemList = [
                                    {"id": buyItem["id"], "count": buyItem["count"]},
                                    {"id": buyItem["costType"], "count": 0 - buyItem["cost"]}
                                ];
                                var updateData = [];
                                async.forEach(itemList, function (itm, forEachCb) {
                                    if (itm["count"] - 0 > 0) mongoStats.dropStats(itm["id"], userUid, '127.0.0.1', null, mongoStats.TABLETSCOMPETE_SHOPBUY, itm["count"]);
                                    else mongoStats.expendStats(itm["id"], userUid, '127.0.0.1', null, mongoStats.E_TABLETS_SHOPBUY, itm["count"]);
                                    stats.dropStats(itm["id"],userUid,"127.0.0.1",null,mongoStats.tabletsGetReward_count,itm["count"]);
                                    modelUtil.addDropItemToDB(itm["id"], itm["count"] - 0, userUid, 0, 1, function (err, res) {
                                        if (err) forEachCb("dbError");
                                        else {
                                            updateData.push(res);
                                            forEachCb(null);
                                        }
                                    });
                                }, function (err) {
                                    if (err) cb(err);
                                    else {
                                        returnValue["updateData"] = updateData;
                                        cb(null);
                                    }
                                });
                            }
                        })
                    }
                }
            });
        },
        function(cb) {// 已购买标识
            redis.user(userUid).h(gsTabletsUser.getGSRedisKey(issueId, "buyGoodsLog")).set(cellId, 1, function (err, res) {
                cb(null);
            });
        }
    ],function(err,res){
        if (err) {
            response.echo("pvp.tabletsShopBuy",  jutil.errorInfo(err));
        } else {
            response.echo("pvp.tabletsShopBuy",  returnValue);
        }
    })
}

function checkCostIsEnough(userUid,costType,costCount,callbackFn) {
    var costType = costType + "";
    switch (costType.substr(0, 2)) {
        case "15"://道具
            item.getItem(userUid, costType, function (err, res) {
                if (err) callbackFn(err)
                else if (res == null || (res["number"] - 0) < (costCount - 0)) callbackFn("noItem");
                else callbackFn(null);
            })
            break;
        default :
            if (costType == "gold") {
                user.getUser(userUid, function (err, res) {
                    if (err) callbackFn(err);
                    else if (res == null || (res["gold"] - 0) < (costCount - 0)) callbackFn("noMoney");
                    else callbackFn(null);
                })
            } else if (costType == "ingot") {
                user.getUser(userUid, function (err, res) {
                    if (err) callbackFn(err);
                    else if (res == null || (res["ingot"] - 0) < (costCount - 0)) callbackFn("ingotNotEnough");
                    else callbackFn(null);
                })
            } else if (costType == "honor") {
                userVariable.getVariable(userUid, "honor", function (err, res) {
                    if (err) callbackFn(err);
                    else if (res == null || (res - 0) < (costCount - 0)) callbackFn("honorNotEnough");
                    else callbackFn(null);
                })
            } else {
                callbackFn("configError");
            }
            break;
    }
}

exports.start = start;