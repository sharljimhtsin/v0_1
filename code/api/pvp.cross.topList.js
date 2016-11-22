/**
 * Created by xiayanxin on 2016/9/19.
 *
 * 跨服激戰 獲取榜單
 */

var pvptop = require("../model/pvpTopCross");
var configManager = require("../config/configManager");
var userVariable = require("../model/userVariable");
var async = require("async");
var jutil = require("../utils/jutil");
var TAG = "pvp.cross.topList";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);
    var pvpRankConfig = configData.getConfig("pvpRankCross");
    var mUserTop = null;//当前用户的排名
    var userTopList = null;//可挑战列表
    var topInfoList = null;//可挑战列表的详细信息
    var counterList = null;//可反击列表
    var top10 = null;//排名前10的玩家
    var rewardTop = null;
    var highest = 0;
    var currentPointInfo = null;//当前玩家的积分
    var pvpChangeTime = null;//今天挑战次数
    var isAll;
    var key;
    var eTime;
    var resultData = {};
    async.series([
        function (cb) {
            pvptop.getConfig(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    key = res[2]["key"] || "1";
                    eTime = res[1];
                    cb();
                }
            });
        },
        function (cb) {
            pvptop.getUserTop(userUid, isAll, function (err, res) {
                if (err) {
                    cb("dbError");
                } else if (res == null) {
                    //報名
                    pvptop.addNewUser(userUid, 0, isAll, function (err, res) {
                        mUserTop = res["top"];
                        cb(err);
                    });
                } else {
                    mUserTop = res["top"];
                    cb();
                }
            });
        },
        function (cb) { //取可挑战的玩家列表
            var rankWatchCount = pvpRankConfig["rankWatchCount"] - 0;
            var rankWatchRatio = pvpRankConfig["rankWatchRatio"] - 0;
            var mTopList = [];
            var preTop = mUserTop;//上一个排名
            for (var i = 0; i < rankWatchCount; i++) {
                preTop = Math.floor(preTop * rankWatchRatio);
                if (preTop > 0) {
                    mTopList.push(preTop);
                }
            }
            pvptop.getUserTopList(userUid, mTopList, isAll, function (err, res) {
                userTopList = res;
                cb(err);
            });
        },
        function (cb) { //取可挑战玩家的详细列表
            if (userTopList == null || userTopList.length == 0) {
                topInfoList = [];
                cb();
            } else {
                topInfoList = [];
                async.forEach(userTopList, function (item, forCb) {
                    var topUserUid = item["userUid"];
                    var isRobot = item["robot"];
                    if (isRobot == 1) {
                        var pvpRankFakeDataConfig = configData.getConfig("pvpRankFakeData");
                        var pvpRankFakeDataConfigItem = pvpRankFakeDataConfig[topUserUid];
                        var userInfo = {};
                        userInfo["top"] = item["top"];
                        userInfo["robot"] = item["robot"];
                        userInfo["userName"] = jutil.toBase64(pvpRankFakeDataConfigItem["playerName"]);
                        userInfo["userLevel"] = pvpRankFakeDataConfigItem["playerLevel"];
                        userInfo["userUid"] = topUserUid;
                        userInfo["heroIdList"] = pvpRankFakeDataConfigItem["heros"];
                        topInfoList.push(userInfo);
                        forCb();
                    } else {
                        pvptop.getPvpUserInfo(topUserUid, function (err, res) {
                            if (err) {
                                forCb("dbError");
                            } else {
                                if (res != null) {
                                    var userInfo = res;
                                    userInfo["top"] = item["top"];
                                    userInfo["robot"] = item["robot"];
                                    topInfoList.push(userInfo);
                                }
                                forCb();
                            }
                        });
                    }
                }, function (err, res) {
                    cb(err);
                });
            }
        },
        function (cb) { //取反击列表
            pvptop.getCounterList(userUid, key, function (err, res) {
                if (err) {
                    cb("dbError");
                } else {
                    var mArr = res;
                    counterList = [];
                    async.forEach(mArr, function (item, forCb) {
                        pvptop.getPvpUserInfo(item, function (err, res) {
                            if (err || res == null) {
                                forCb("dbError");
                            } else {
                                var userInfo = res;
                                pvptop.getUserTop(item, isAll, function (err, res) {
                                    if (err || res == null) {
                                        forCb("dbError");
                                    } else {
                                        userInfo["top"] = res["top"];
                                        userInfo["robot"] = 0;
                                        counterList.push(userInfo);
                                        forCb();
                                    }
                                });
                            }
                        });
                    }, function (err) {
                        cb(err);
                    });
                }
            });
        },
        function (cb) {
            pvptop.getTop10(userUid, isAll, function (err, res) {
                top10 = res;
                cb(err);
            });
        },
        function (cb) { //取当前积分点
            pvptop.getCurrentPoint(userUid, isAll, function (err, res) {
                currentPointInfo = res;
                cb(err);
            });
        },
        function (cb) { //当前任务奖励
            pvptop.getTopTaskReward(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    if (res == null) {
                        var rankConfig = configData.getConfig("pvpRankCross");
                        var rankRewardLiquid = rankConfig["rankRewardLiquid"];
                        var smallestTop = 0;
                        for (var key in rankRewardLiquid) {
                            var item = rankRewardLiquid[key];
                            if (smallestTop < item["rank"]) {
                                smallestTop = item["rank"];
                            }
                        }
                        userVariable.setVariable(userUid, "pvpTaskRewardCross", smallestTop, function (err, res) {
                            if (err || res == null) {
                                cb("taskRewardInitWrong");
                            } else {
                                rewardTop = res;
                                cb();
                            }
                        });
                    } else {
                        rewardTop = res;
                        cb();
                    }
                }
            });
        },
        function (cb) { //历史最高纪录
            pvptop.getHighest(userUid, function (err, res) {
                if (err) {
                    cb("dbError");
                } else {
                    if (res == null) {
                        highest = 0;
                    } else {
                        highest = res;
                    }
                    cb();
                }
            });
        },
        function (cb) { //取总挑战次数
            pvptop.getChallengeTimes(userUid, function (err, res) {
                pvpChangeTime = res["value"];
                cb(err);
            });
        },
        function (cb) {
            if (jutil.now() > eTime - 86400 * 2) {
                resultData["rewardTime"] = 1;
            } else {
                resultData["rewardTime"] = 0;
            }
            cb();
        }
    ], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            resultData["challengerList"] = topInfoList;
            resultData["counterList"] = counterList;
            resultData["top10"] = top10;
            resultData["rewardTop"] = rewardTop;
            resultData["highest"] = highest;
            resultData["userTop"] = mUserTop;
            resultData["currentPointInfo"] = currentPointInfo;
            resultData["pvpChangeTime"] = pvpChangeTime;
            response.echo(TAG, resultData);
        }
    });
}

exports.start = start;