/**
 * Created by xiayanxin on 2016/10/17.
 *
 * 資源爭奪戰 商店列表接口
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var user = require("../model/user");
var activityConfig = require("../model/activityConfig");
var leagueTeam = require("../model/leagueTeam");
var TAG = "leagueTeam.shop";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "type") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var type = postData["type"];
    var sTime;
    var configData;
    var returnValue = {};
    var leagueUid;
    var key;
    async.series([
        function (cb) { // 活动配制
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
        function (cb) {
            myShop(userUid, configData, type, sTime, leagueUid, key, function (err, res) {
                if (err) cb(err);
                else {
                    returnValue = res;
                    returnValue["freshCost"] = configData["shop"]["freshCost"];
                    cb();
                }
            });
        },
        function (cb) {// 每个单元格购买状态
            var cells = configData["shop"]["cell"];
            var forEachList = [];
            for (var key in cells) {
                forEachList.push((key));
            }
            async.forEachSeries(forEachList, function (cellId, forEachFn) {
                redis.user(userUid).h("leagueTeam:buyGoodsLog").get(cellId, function (err, res) {
                    if (err) forEachFn(err);
                    else {
                        returnValue["cell"][cellId]["state"] = res - 0;
                        forEachFn();
                    }
                });
            }, function (err, res) {
                cb(err);
            });
        }
    ], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, returnValue);
        }
    });
}

function myShop(userUid, activityConfig, type, sTime, leagueUid, key, callbackFn) {
    var returnValue = {};
    async.series([
        function (cb) {
            leagueTeam.getScore(userUid, leagueUid, key, function (err, res) {
                returnValue["score"] = res;
                cb(err);
            });
        },
        function (cb) {
            user.getUser(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else if (type > 0) {
                    var refreshCost = activityConfig["shop"]["freshCost"] - 0;
                    var resultUserIngot = res["ingot"] - 0 - refreshCost;
                    if (resultUserIngot < 0) {
                        cb("ingotNotEnough");
                    } else {
                        var newIngot = {"ingot": resultUserIngot};
                        user.updateUser(userUid, newIngot, function (err, res) {
                            returnValue["ingot"] = newIngot;
                            cb(err);
                        });
                    }
                } else {
                    cb();
                }
            });
        },
        function (cb) { // 是否刷新商品
            redis.user(userUid).s("leagueTeam:shopGoods").getObj(function (err, res) {
                if (err) {
                    cb(err);
                } else if (res == null || type > 0) {//商品已过期或者用户强刷
                    getCellGoods(userUid, activityConfig, function (err, res) {
                        returnValue["cell"] = res;
                        cb(err);
                    })
                } else {
                    returnValue["cell"] = res;
                    cb();
                }
            });
        }
    ], function (err, res) {
        callbackFn(err, returnValue);
    });
}

function getCellGoods(userUid, activityConfig, callbackFn) {
    var cells = activityConfig["shop"]["cell"];
    var returnCells = {};
    for (var key in cells) {
        var currentCell = cells[key];
        var randomRate = Math.random();
        var compareRate = 0;
        for (var c in currentCell) {
            compareRate += currentCell[c]["prob"] - 0;
            if (randomRate <= compareRate) {
                returnCells[key] = currentCell[c];
                break;
            }
        }
    }

    redis.user(userUid).s("leagueTeam:shopGoods").setObj(returnCells, function (err, res) {
        //清除购买记录
        redis.user(userUid).h("leagueTeam:buyGoodsLog").del();
        callbackFn(err, returnCells);
    });
}

exports.start = start;