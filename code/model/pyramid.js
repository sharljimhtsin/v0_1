/**
 * Created by xiazhengxin on 2017/6/6.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var activityData = require("../model/activityData");
var activityConfig = require("../model/activityConfig");
var modelUtil = require("../model/modelUtil");
var item = require("../model/item");
var heroSoul = require("../model/heroSoul");
var formation = require("../model/formation");
var bitUtil = require("../alien/db/bitUtil");
var redis = require("../alien/db/redis");
var TAG = "pyramid";

function getConfig(userUid, isIngot, cb) {
    var name = getName(isIngot);
    activityConfig.getConfig(userUid, name, function (err, res) {
        if (err || res == null) {
            cb("CannotgetConfig");
        } else {
            if (res[0]) {
                var sTime = res[4];
                var eTime = res[5];
                var currentConfig = res[2];
                cb(null, [sTime, eTime, currentConfig]);
            } else {
                cb("notOpen");
            }
        }
    });
}

function getName(isIngot) {
    return isIngot ? TAG + ":Ingot" : TAG + ":Item";
}

function getActName(isIngot) {
    return isIngot ? activityData.PRACTICE_Pyramid_INGOT : activityData.PRACTICE_Pyramid_ITEM;
}

function payWithReward(userUid, ingot, cb) {
    var currentConfig;
    async.series([function (sCb) {
        getConfig(userUid, true, function (err, res) {
            if (err) {
                sCb(err);
            } else {
                currentConfig = res[2];
                sCb();
            }
        });
    }, function (eCb) {
        var multiplex = ingot / parseInt(currentConfig["payReward"]["money"]);
        if (multiplex >= 1) {
            var reward = currentConfig["payReward"]["reward"];
            async.eachSeries(reward, function (one, eaCb) {
                modelUtil.addDropItemToDB(one["id"], one["count"] * multiplex, userUid, false, 1, eaCb);
                //mongoStats.dropStats(one["id"],userUid,"127.0.0.1",null,mongoStats.FOOLISH1,one["count"]);
            }, eCb);
        } else {
            eCb();
        }
    }], cb);
}

function checkIfEnough(userUid, element, cb) {
    element["id"] = element["id"].toString();
    element["count"] = parseInt(element["count"]);
    if (element["id"] == "ingot") {
        user.getUserDataFiled(userUid, "ingot", function (err, res) {
            if (err) {
                cb(err);
            } else {
                cb(null, res >= element["count"]);
            }
        });
    } else if (element["id"] == "gold") {
        user.getUserDataFiled(userUid, "gold", function (err, res) {
            if (err) {
                cb(err);
            } else {
                cb(null, res >= element["count"]);
            }
        });
    } else if (element["id"].substr(0, 2) == "10") {
        heroSoul.getHeroSoulItem(userUid, element["id"], function (err, res) {
            if (err) {
                cb(err);
            } else if (res == null) {
                cb(null, false);
            } else {
                cb(null, res["count"] >= element["count"]);
            }
        });
    } else {
        item.getItem(userUid, element["id"], function (err, res) {
            if (err) {
                cb(err);
            } else if (res == null) {
                cb(null, false);
            } else {
                cb(null, res["number"] >= element["count"]);
            }
        });
    }
}

function getPyramidData(userUid, sTime, currentConfig, isIngot, cb) {
    var actName = getActName(isIngot);
    var defaultData = {
        "times": 0,
        "score": 0,
        "currentLevel": 1,
        "isGotAll": 0,
        "shopList": currentConfig["shopList"],
        "tower": currentConfig["tower"],
        "achievement": currentConfig["achievement"]
    };
    activityData.getActivityData(userUid, actName, function (err, res) {
        if (res != null && res["dataTime"] == sTime) {
            if (err) {
                cb(err);
            } else {
                var obj;
                var jsonObj;
                if (res["arg"] == "") {
                    obj = defaultData;
                } else {
                    try {
                        jsonObj = JSON.parse(res["arg"]);
                    } catch (e) {
                        jsonObj = defaultData;
                    } finally {
                        obj = jsonObj;
                    }
                }
                cb(err, obj);
            }
        } else {
            setPyramidData(userUid, sTime, defaultData, isIngot, function (err, res) {
                cb(err, defaultData);
            });
        }
    });
}

function setPyramidData(userUid, sTime, data, isIngot, cb) {
    var actName = getActName(isIngot);
    var mObj = {};
    mObj["data"] = 0;
    mObj["dataTime"] = sTime;
    mObj["status"] = 0;
    mObj["statusTime"] = 0;
    mObj["arg"] = JSON.stringify(data);
    activityData.updateActivityData(userUid, actName, mObj, cb);
}

function addToRank(userUid, count, rankLine, eTime, isAll, key, callbackFn) {
    if (count > rankLine) {
        var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210--跨服|全平台|单服
        var time = eTime - jutil.now();
        var number = bitUtil.leftShift(count, 24) + time;
        redis[rk](userUid).z(TAG + ":topList:" + key).add(number, userUid, callbackFn);
    } else {
        callbackFn();
    }
}

function getRank(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210--跨服|全平台|单服
    redis[rk](userUid).z(TAG + ":topList:" + key).revrank(userUid, callbackFn);
}

function getRankList(userUid, isAll, key, currentConfig, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210--跨服|全平台|单服
    var rankList = [];
    redis[rk](userUid).z(TAG + ":topList:" + key).revrange(0, 9, "WITHSCORES", function (err, res) {
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
                    userScore = bitUtil.rightShift(item - 0, 24);
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

function getRewardStatus(userUid, key, callbackFn) {
    userVariable.getVariable(userUid, TAG + ":rewardStatus", function (err, res) {
        var ok = true;
        if (res && res == key) {
            ok = false;
        }
        callbackFn(err, ok);
    });
}

function setRewardStatus(userUid, key, callbackFn) {
    userVariable.setVariable(userUid, TAG + ":rewardStatus", key, callbackFn);
}

exports.getConfig = getConfig;
exports.getPyramidData = getPyramidData;
exports.setPyramidData = setPyramidData;
exports.checkIfEnough = checkIfEnough;
exports.payWithReward = payWithReward;
exports.addToRank = addToRank;
exports.getRank = getRank;
exports.getRankList = getRankList;
exports.setRewardStatus = setRewardStatus;
exports.getRewardStatus = getRewardStatus;
exports.getName = getName;