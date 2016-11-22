/**
 * Created by xiayanxin on 2016/10/17.
 *
 * 資源爭奪戰 商店购买接口
 */

var async = require("async");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var modelUtil = require("../model/modelUtil");
var item = require("../model/item");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var activityConfig = require("../model/activityConfig");
var leagueTeam = require("../model/leagueTeam");
var TAG = "leagueTeam.shopBuy";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "cellId") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var cellId = postData["cellId"];//cellId值从1开始
    var sTime;
    var configData;
    var returnValue = {};
    var leagueUid;
    var key;
    async.series([
        function (cb) {// 开服时间条件
            leagueTeam.getConfig(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    sTime = res[0] - 0;
                    configData = res[2];
                    key = configData["key"];
                    if (sTime >= jutil.now() || sTime + 86400 * 5.8 >= jutil.now()) {
                        cb("timeNotMatch");
                    } else {
                        cb();
                    }
                }
            });
        },
        function (cb) {
            user.getUser(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    if (res == null || res["leagueUid"] == 0) {
                        cb("noLeague");
                    } else {
                        leagueUid = res["leagueUid"];
                        cb();
                    }
                }
            });
        },
        function (cb) { // 是否有购买过
            redis.user(userUid).h("leagueTeam:buyGoodsLog").get(cellId, function (err, res) {
                if (err) {
                    cb(err);
                } else if (res == null) {
                    cb();
                } else {
                    cb("postError");//已经购买过
                }
            });
        },
        function (cb) {// 购买
            redis.user(userUid).s("leagueTeam:shopGoods").getObj(function (err, res) {
                if (err) {
                    cb(err);
                } else if (res == null || res[cellId] == null) {
                    cb("postError");
                } else {
                    var buyItem = res[cellId];
                    checkCostIsEnough(userUid, buyItem["costType"], buyItem["cost"] - 0, sTime, leagueUid, key, function (err, res) {
                        if (err) {
                            cb(err);
                        } else {
                            var itemList = [
                                {"id": buyItem["id"], "count": buyItem["count"], "type": "get"},
                                {"id": buyItem["costType"], "count": buyItem["cost"], "type": "cost"}
                            ];
                            async.forEachSeries(itemList, function (itm, forEachCb) {
                                if (itm["id"] == "score") {
                                    var score;
                                    async.series([function (cbb) {
                                        leagueTeam.getScore(userUid, leagueUid, key, function (err, res) {
                                            if (res < itm["count"]) {
                                                cbb("scoreNotEnough");
                                            } else {
                                                score = res;
                                                cbb(err);
                                            }
                                        });
                                    }, function (cbb) {
                                        leagueTeam.modifyScore(userUid, leagueUid, score - itm["count"], key, function (err, res) {
                                            cbb(err);
                                        });
                                    }, function (cbb) {
                                        leagueTeam.getScore(userUid, leagueUid, key, function (err, res) {
                                            score = res;
                                            cbb(err);
                                        });
                                    }], function (err, res) {
                                        returnValue["score"] = score;
                                        forEachCb(err);
                                    });
                                } else {
                                    modelUtil.addDropItemToDB(itm["id"], itm["count"] - 0, userUid, 0, 1, function (err, res) {
                                        if (err) {
                                            forEachCb("dbError");
                                        } else {
                                            returnValue["item"] = res;
                                            forEachCb();
                                        }
                                    });
                                }
                            }, function (err) {
                                cb(err);
                            });
                        }
                    });
                }
            });
        },
        function (cb) {// 已购买标识
            redis.user(userUid).h("leagueTeam:buyGoodsLog").setex(86400 * 7, cellId, 1, cb);
        }, function (cb) {
            user.getUser(userUid, function (err, res) {
                returnValue["ingot"] = res["ingot"];
                cb(err);
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

function checkCostIsEnough(userUid, itemId, costCount, sTime, leagueUid, key, callbackFn) {
    var itemId = itemId + "";
    switch (itemId.substr(0, 2)) {
        case "15"://道具
            item.getItem(userUid, itemId, function (err, res) {
                if (err) callbackFn(err)
                else if (res == null || (res["number"] - 0) < costCount) callbackFn("noItem");
                else callbackFn(null);
            });
            break;
        default :
            if (itemId == "gold") {
                user.getUser(userUid, function (err, res) {
                    if (err) callbackFn(err);
                    else if (res == null || (res["gold"] - 0) < costCount) callbackFn("noMoney");
                    else callbackFn(null);
                });
            } else if (itemId == "ingot") {
                user.getUser(userUid, function (err, res) {
                    if (err) callbackFn(err);
                    else if (res == null || (res["ingot"] - 0) < costCount) callbackFn("ingotNotEnough");
                    else callbackFn(null);
                });
            } else if (itemId == "honor") {
                userVariable.getVariable(userUid, "honor", function (err, res) {
                    if (err) callbackFn(err);
                    else if (res == null || (res - 0) < costCount) callbackFn("honorNotEnough");
                    else callbackFn(null);
                });
            } else if (itemId == "score") {
                leagueTeam.getScore(userUid, leagueUid, key, function (err, res) {
                    if (err || res == null) callbackFn(err);
                    else if (res < costCount) callbackFn("scoreNotEnough");
                    else callbackFn(null);
                });
            } else {
                callbackFn("configError");
            }
            break;
    }
}

exports.start = start;