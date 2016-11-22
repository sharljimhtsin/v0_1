/**
 * Created by xiazhengxin on 2015/3/16 13:39.
 *
 * 极地大乱斗 商店购买
 */

var async = require("async");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var modelUtil = require("../model/modelUtil");
var item = require("../model/item");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var activityConfig = require("../model/activityConfig");
var mixContestData = require("../model/mixContestData");
var mongoStats = require("../model/mongoStats");
var TAG = "pvp.mixContest.buy";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "cellId") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var cellId = postData["cellId"];//cellId值从1开始
    var sTime;
    var isAll;
    var key;
    var returnValue = {};
    async.series([
        function (cb) {// 开服时间条件
            mixContestData.getConfig(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    sTime = res[0] - 0;
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    key = res[2]["key"] || "1";
                    cb(null);
                }
            });
        },
        function (cb) { // 是否有购买过
            redis.user(userUid).h("mixContest:buyGoodsLog").get(cellId, function (err, res) {
                if (err) cb(err);
                else if (res == null) cb(null);
                else cb("postError");//已经购买过
            })
        },
        function (cb) {// 购买
            redis.user(userUid).s("mixContest:shopGoods").getObj(function (err, res) {
                if (err) cb(err);
                else if (res == null || res[cellId] == null) cb("postError");
                else {
                    var buyItem = res[cellId];
                    checkCostIsEnough(userUid, buyItem["costType"], buyItem["cost"] - 0, function (err, res) {
                        if (err) cb(err);
                        else {
                            var itemList = [
                                {"id": buyItem["id"], "count": buyItem["count"], "type": "get"},
                                {"id": buyItem["costType"], "count": 0 - buyItem["cost"], "type": "cost"}
                            ];
                            async.forEachSeries(itemList, function (itm, forEachCb) {
                                if (itm["id"] == "score") {
                                    var score;
                                    async.series([function (cbb) {
                                        mixContestData.modifyScore(userUid, itm["count"], function (err, res) {
                                            cbb(err);
                                        });
                                    }, function (cbb) {
                                        mixContestData.getUserData(userUid, function (err, res) {
                                            if (err) {
                                                cbb(err);
                                            } else {
                                                score = res["data"];
                                                cbb(null);
                                            }
                                        });
                                    }], function (err, res) {
                                        if (err) {
                                            forEachCb(err);
                                        } else {
                                            returnValue["score"] = score;
                                            forEachCb();
                                        }
                                    });
                                } else {
                                    mongoStats.dropStats(itm["id"], userUid, "127.0.0.1", null, mongoStats.mixContest1, itm["count"]);
                                    modelUtil.addDropItemToDB(itm["id"], itm["count"] - 0, userUid, 0, 1, function (err, res) {
                                        if (err) forEachCb("dbError");
                                        else {
                                            returnValue["item"] = res;
                                            forEachCb(null);
                                        }
                                    });
                                }
                            }, function (err) {
                                if (err) cb(err);
                                else {
                                    cb(null);
                                }
                            });
                        }
                    });
                }
            });
        },
        function (cb) {// 已购买标识
            redis.user(userUid).h("mixContest:buyGoodsLog").set(cellId, 1, cb);
        }, function (cb) {
            user.getUser(userUid, function (err, res) {
                if (err) cb(err);
                else {
                    returnValue["ingot"] = res["ingot"];
                    cb(null);
                }
            });
        }
    ], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, returnValue);
        }
    })
}

function checkCostIsEnough(userUid, itemId, costCount, callbackFn) {
    var itemId = itemId + "";
    switch (itemId.substr(0, 2)) {
        case "15"://道具
            item.getItem(userUid, itemId, function (err, res) {
                if (err) callbackFn(err)
                else if (res == null || (res["number"] - 0) < costCount) callbackFn("noItem");
                else callbackFn(null);
            })
            break;
        default :
            if (itemId == "gold") {
                user.getUser(userUid, function (err, res) {
                    if (err) callbackFn(err);
                    else if (res == null || (res["gold"] - 0) < costCount) callbackFn("noMoney");
                    else callbackFn(null);
                })
            } else if (itemId == "ingot") {
                user.getUser(userUid, function (err, res) {
                    if (err) callbackFn(err);
                    else if (res == null || (res["ingot"] - 0) < costCount) callbackFn("ingotNotEnough");
                    else callbackFn(null);
                })
            } else if (itemId == "honor") {
                userVariable.getVariable(userUid, "honor", function (err, res) {
                    if (err) callbackFn(err);
                    else if (res == null || (res - 0) < costCount) callbackFn("honorNotEnough");
                    else callbackFn(null);
                })
            } else if (itemId == "score") {
                mixContestData.getUserData(userUid, function (err, res) {
                    if (err || res == null) callbackFn(err);
                    else if (res["data"] < costCount) callbackFn("scoreNotEnough");
                    else callbackFn(null);
                });
            } else {
                callbackFn("configError");
            }
            break;
    }
}

exports.start = start;