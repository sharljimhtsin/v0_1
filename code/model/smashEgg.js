/******************************************************************************
 * 砸金蛋
 * Create by joseppe.
 * Create at 15-3-17.
 *****************************************************************************/
/**
 * 1.取配置，判断活动是否开，（活动配置和奖励配置）
 * 2.取个人充值数
 * 3.取人数，充值的即加1
 * 4.取状态，并返回
 * 5.发奖励（1.立即领取--个人，2.邮件发送--全服）
 *
 * **/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var formation = require("../model/formation");
var bitUtil = require("../alien/db/bitUtil");
var ACTIVITY_CONFIG_NAME = "smashEgg";

//获取配置
function getConfig(userUid, callbackFn) {
    // 1.获取活动配置数据
    activityConfig.getConfig(userUid, ACTIVITY_CONFIG_NAME, function (err, res) {
        if (err || res == null)callbackFn("CannotgetConfig");
        else {
            if (res[0]) {
                var sTime = res[4];
                var eTime = res[5];
                var currentConfig = res[2];
                callbackFn(null, [sTime, eTime, currentConfig]);
            } else {
                callbackFn("notOpen");
            }
        }
    });
}
//设置参与人数
function setUserData(userUid, data, callbackFn) {//cType
    activityData.updateActivityData(userUid, activityData.PRACTICE_SMASHEGG, data, callbackFn);
}
//获取领取奖励状态
function getUserData(userUid, refresh, callbackFn) {
    var returnData = {"data": 0, "dataTime": 0, "status": 0, "statusTime": 0};
    var init = true;
    var activityConfig;
    var arg = [];
    var eTime = 0;
    async.series([function (cb) {
        getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                returnData["dataTime"] = res[0];
                eTime = res[1];
                activityConfig = res[2];
                cb(null);
            }
        });
    }, function (cb) {
        activityData.getActivityData(userUid, activityData.PRACTICE_SMASHEGG, function (err, res) {
            if (err) {
                cb(err);
                return;
            }
            if (res != null && returnData["dataTime"] == res["dataTime"]) {
                returnData["data"] = res["data"] - 0;
                returnData["status"] = res["status"] - 0;
                returnData["statusTime"] = res["statusTime"] - 0;
                init = false;
            }
            cb(null);
        });
    }, function (cb) {
        if (refresh || init || returnData["status"] >= activityConfig["freeTime"]) {
            cb(null);
        } else {
            redis.user(userUid).s("smashEgg:arg").getObj(function (err, res) {
                arg = res;
                if (arg == null) {
                    arg = [];
                    init = true;
                }
                cb(err);
            });
        }
    }, function (cb) {
        if (refresh || init || returnData["status"] >= activityConfig["freeTime"]) {
            var index = [0, 1, 2, 3, 4, 5];
            index.sort(function () {
                return Math.random() > 0.5
            });
            for (var i = 0; i < 6; i++) {
                var r = Math.random();
                var p = 0;
                for (var j in activityConfig["viewAll"]) {
                    p += activityConfig["viewAll"][j]["pro"] - 0;
                    if (r <= p) {
                        arg.push({
                            "id": activityConfig["viewAll"][j]["id"],
                            "count": activityConfig["viewAll"][j]["count"],
                            "chui": false,
                            "index": index.pop()
                        });
                        break;
                    }
                }
            }
            returnData["status"] = 0;
            activityData.updateActivityData(userUid, activityData.PRACTICE_SMASHEGG, jutil.deepCopy(returnData), function (err, res) {
                redis.user(userUid).s("smashEgg:arg").setObj(arg, cb);
            });
        } else {
            cb(null);
        }
    }], function (err, res) {
        returnData["arg"] = arg;
        callbackFn(err, returnData);
    });
}

function addToRank(userUid, count, rankLine, eTime, isAll, key, callbackFn) {
    var totalCount = 0;
    async.series([function (cb) {
        userVariable.getVariable(userUid, "smashCount", function (err, res) {
            var tmpData = res ? res : "0_0";
            tmpData = tmpData.split("_");
            if (tmpData[1] == key) {
                totalCount = tmpData[0];
            }
            cb(err);
        });
    }, function (cb) {
        totalCount = parseInt(totalCount) + parseInt(count);
        userVariable.setVariable(userUid, "smashCount", totalCount.toString() + "_" + key, cb);
    }, function (cb) {
        if (totalCount > rankLine) {
            var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210--跨服|全平台|单服
            var time = eTime - jutil.now();
            var number = bitUtil.leftShift(totalCount, 24) + time;
            redis[rk](userUid).z(ACTIVITY_CONFIG_NAME + ":topList:" + key).add(number, userUid, cb);
        } else {
            cb();
        }
    }], function (err, res) {
        callbackFn(err);
    });
}

function getRankList(userUid, isAll, key, currentConfig, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210--跨服|全平台|单服
    var rankList = [];
    redis[rk](userUid).z(ACTIVITY_CONFIG_NAME + ":topList:" + key).revrange(0, 6, "WITHSCORES", function (err, res) {
        if (res && res.length > 0) {
            var c = 0;
            var userUid;
            var userScore;
            var userName;
            var heroId;
            var reward;
            async.eachSeries(res, function (item, rankCb) {
                c++;
                if (c % 2 == 0) {
                    var top = c / 2;
                    var number = bitUtil.rightShift(item - 0, 24);
                    userScore = number;
                    async.series([function (selectCb) {
                        user.getUserDataFiled(userUid, "userName", function (err, res) {
                            userName = res;
                            selectCb(err);
                        });
                    }, function (selectCb) {
                        formation.getUserHeroId(userUid, function (err, res) {
                            heroId = res;
                            selectCb(err);
                        });
                    }, function (selectCb) {
                        // 獎勵配置格式參考累計充值 BY:運營
                        for (var i in currentConfig["rankRewardList"]) {
                            if (top == currentConfig["rankRewardList"][i]["top"]) {
                                reward = currentConfig["rankRewardList"][i]["reward"];
                                break;
                            }
                        }
                        selectCb();
                    }], function (err, res) {
                        rankList.push(jutil.deepCopy({
                            "userUid": userUid,
                            "userName": userName,
                            "number": userScore,
                            "heroId": heroId,
                            "top": top,
                            "reward": reward

                        }));
                        rankCb(err);
                    });
                } else {
                    userUid = item;
                    rankCb();
                }
            }, function (err, res) {
                callbackFn(err, rankList);
            });
        } else {
            callbackFn(err, rankList);
        }
    });
}

function getRank(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210--跨服|全平台|单服
    redis[rk](userUid).z(ACTIVITY_CONFIG_NAME + ":topList:" + key).revrank(userUid, callbackFn);
}

function getRewardStatus(userUid, key, callbackFn) {
    userVariable.getVariable(userUid, ACTIVITY_CONFIG_NAME + ":rewardStatus", function (err, res) {
        var ok = true;
        if (res && res == key) {
            ok = false;
        }
        callbackFn(err, ok);
    });
}

function setRewardStatus(userUid, key, callbackFn) {
    userVariable.setVariable(userUid, ACTIVITY_CONFIG_NAME + ":rewardStatus", key, callbackFn);
}

exports.getConfig = getConfig;//获取配置
exports.setUserData = setUserData;//加参与数
exports.getUserData = getUserData;//获取领取奖励状态
exports.addToRank = addToRank;
exports.getRankList = getRankList;
exports.getRank = getRank;
exports.getRewardStatus = getRewardStatus;
exports.setRewardStatus = setRewardStatus;
