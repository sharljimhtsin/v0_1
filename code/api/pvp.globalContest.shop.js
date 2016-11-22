/**
 * Created by xiazhengxin on 2015/2/6 16:48.
 *
 * 天下第一武道会 商店列表接口
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var item = require("../model/item");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var activityConfig = require("../model/activityConfig");
var globalContestData = require("../model/globalContestData");
var mongoStats = require("../model/mongoStats");
var TAG = "pvp.globalContest.shop";

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
    async.series([
        function (cb) { // 活动配制
            globalContestData.getConfig(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    sTime = res[0] - 0;
                    configData = res[2];
                    cb(null);
                }
            });
        },
        function (cb) {
            myShop(userUid, configData, type, function (err, res) {
                if (err) cb(err);
                else {
                    returnValue = res;
                    returnValue["freshCost"] = configData["shop"]["freshCost"];
                    cb(null);
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
                redis.user(userUid).h("globalContest:buyGoodsLog").get(cellId, function (err, res) {
                    if (err) forEachFn(err);
                    else {
                        returnValue["cell"][cellId]["state"] = res - 0;
                        forEachFn(null);
                    }
                });
            }, function (err, res) {
                cb(err);
            })
        }
    ], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, returnValue);
        }
    })
}

function myShop(userUid, activityConfig, type, callbackFn) {
    var returnValue = {};
    async.series([
        function (cb) {
            globalContestData.getUserData(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    returnValue["score"] = res["data"];
                    cb(null);
                }
            });
        },
        function (cb) {
            user.getUser(userUid, function (err, res) {
                if (err) cb(err);
                else {
                    if (type == 0) {
                        returnValue["ingot"] = res["ingot"];
                        cb();
                    } else {
                        var userData = res;
                        var refreshCost = activityConfig["shop"]["freshCost"] - 0;
                        var resultUserIngot = res["ingot"] - 0 - refreshCost;
                        if (resultUserIngot < 0) cb("ingotNotEnough");
                        else {
                            var newIngot = {"ingot": resultUserIngot};
                            user.updateUser(userUid, newIngot, function (err, res) {
                                if (err) {
                                    cb(err);
                                } else {
                                    mongoStats.expendStats("ingot", userUid, "127.0.0.1", userData, mongoStats.GLOBALCONTEST_SHOP, refreshCost);
                                    returnValue["ingot"] = newIngot;
                                    cb();
                                }
                            });
                        }
                    }
                }
            });
        },
        function (cb) { // 是否刷新商品
            redis.user(userUid).s("globalContest:shopGoods").getObj(function (err, res) {
                if (err) cb(err);
                else if (res == null || type == 1) {//商品已过期或者用户强刷
                    getCellGoods(userUid, activityConfig, function (err, res) {
                        if (err) cb(err);
                        else {
                            returnValue["cell"] = res;
                            cb(null);
                        }
                    })
                } else {
                    returnValue["cell"] = res;
                    cb(null);
                }
            });
        },
        function (cb) { // 下次刷新时间
            userVariable.getVariable(userUid, "nextReShop", function (err, res) {
                if (err) cb(err);
                else {
                    returnValue["refreshTime"] = activityConfig["shop"]["freshTime"] - 0;
                    returnValue["nextRefreshTime"] = res - 0 + (activityConfig["shop"]["freshTime"] - 0);//下次刷新时间
                    returnValue["haveSecond"] = returnValue["nextRefreshTime"] - 0 - jutil.now();//距刷新剩余秒数
                    returnValue["haveSecond"] = (returnValue["haveSecond"] - 0 > 0) ? returnValue["haveSecond"] : 0;
                    cb(null);
                }
            });
        }
    ], function (err, res) {
        callbackFn(err, returnValue);
    });
}

function getCellGoods(userUid, activityConfig, callbackFn) {
    userVariable.setVariable(userUid, "nextReShop", jutil.now(), function (err, res) {
        if (err) callbackFn(err);
        else {
            var cells = activityConfig["shop"]["cell"];
            var returnCells = {};
            for (var key in cells) {
                var curcell = cells[key];
                var randomRate = Math.random();
                var compareRate = 0;
                for (var c in curcell) {
                    compareRate += curcell[c]["prob"] - 0;
                    if (randomRate <= compareRate) {
                        returnCells[key] = curcell[c];
                        break;
                    }
                }
            }

            redis.user(userUid).s("globalContest:shopGoods").setObj(returnCells, function (err, res) {
                //设置有效期
                var freshTime = activityConfig["shop"]["freshTime"] - 0;
                redis.user(userUid).s("globalContest:shopGoods").expire(freshTime);

                //清除购买记录
                redis.user(userUid).h("globalContest:buyGoodsLog").del();

                callbackFn(err, returnCells);
            })
        }
    });
}

exports.start = start;