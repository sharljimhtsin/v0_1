/**
 * Created by xiazhengxin on 2017/6/12.
 */

var jutil = require("../utils/jutil");
var async = require("async");
var pyramid = require("../model/pyramid");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var TAG = "pyramid.dragon.mall.exchange";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "index") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var isIngot = false;
    var index = postData["index"];
    var buyCount = postData["count"] ? postData["count"] : 1;
    var buyResult;
    var shopList;
    var shopItem;
    var currentConfig;//配置
    var sTime = 0;//活动开始时间
    var eTime = 0;//活动结束时间
    var userData;
    var costId = "153696";//神龙币
    var returnData = [];
    async.series([
        function (cb) {
            pyramid.getConfig(userUid, isIngot, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    currentConfig = res[2];
                    sTime = res[0];
                    eTime = res[1];
                    cb();
                }
            });
        }, function (cb) {
            if (sTime <= jutil.now() && eTime >= jutil.now()) {
                cb();
            } else {
                cb("TIME ERROR");
            }
        }, function (cb) {
            pyramid.getPyramidData(userUid, sTime, currentConfig, isIngot, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    userData = res;
                    shopList = userData["shopList"];
                    cb();
                }
            });
        }, function (cb) {//取商城数据(根据下标)
            if (shopList[index] == undefined) {
                cb("notSold");
            } else {
                shopItem = shopList[index];
                cb();
            }
        }, function (cb) {
            if (shopItem.hasOwnProperty("got")) {
                cb("gotYet");
            } else {//兑换
                shopItem["got"] = 1;
                shopList[index] = shopItem;
                userData["shopList"] = shopList;
                cb();
            }
        }, function (cb) {//兑换，1。先判断积分是否充足，够的情况下，积分扣除，物品获得；不够的情况，报错
            pyramid.checkIfEnough(userUid, {
                "id": costId,
                "count": shopItem["cost"] * buyCount
            }, function (err, isOk) {
                if (err) {
                    cb(err);
                } else if (isOk) {
                    modelUtil.addDropItemToDB(costId, shopItem["cost"] * buyCount * -1, userUid, 1, 1, function (err, res) {
                        mongoStats.expendStats(costId, userUid, "127.0.0.1", null, mongoStats.PYRAMID22, shopItem["cost"] * buyCount);
                        returnData.push(res);
                        cb(err);
                    });
                } else {
                    cb("not enough");
                }
            });
        }, function (cb) {
            pyramid.setPyramidData(userUid, sTime, userData, isIngot, cb);
        }, function (cb) {
            var mItemId = shopItem["id"];
            modelUtil.addDropItemToDB(mItemId, buyCount * shopItem["count"], userUid, false, 1, function (err, res) {
                switch (mItemId) {
                    case "ingot":
                        mongoStats.dropStats(mItemId, userUid, "127.0.0.1", null, mongoStats.PYRAMID8, buyCount * shopItem["count"]);
                        break;
                    case "gold":
                        mongoStats.dropStats(mItemId, userUid, "127.0.0.1", null, mongoStats.PYRAMID14, buyCount * shopItem["count"]);
                        break;
                    default:
                        mongoStats.dropStats(mItemId, userUid, "127.0.0.1", null, mongoStats.PYRAMID20, buyCount * shopItem["count"]);
                }
                buyResult = res;
                cb();
            });
        }
    ], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            var resultData = {};
            resultData["chipData"] = returnData;
            resultData["dropItemData"] = buyResult;
            response.echo(TAG, resultData);
        }
    });
}
exports.start = start;