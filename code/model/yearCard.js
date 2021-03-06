/**
 * Created by xiazhengxin on 2017/5/15.
 */

var redis = require("../alien/db/redis");
var async = require("async");
var modelUtil = require("../model/modelUtil");
var mail = require("../model/mail");
var userVariable = require("../model/userVariable");
var mongoStats = require("../model/mongoStats");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var configManager = require("../config/configManager");
var ACTIVITY_CONFIG_NAME = "yearCard";

//获取配置
function getConfig(userUid, callbackFn) {
    activityConfig.getConfig(userUid, ACTIVITY_CONFIG_NAME, function (err, res) {
        if (err || res == null) {
            callbackFn("CannotgetConfig");
        } else {
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

/**
 * 发放奖励
 */
function reward(userUid, reward, callbackFn, isVip) {
    var backItems = [];
    async.series([
        function (callback) {
            async.eachSeries(reward, function (item, forCb) {
                mongoStats.dropStats(item["id"], userUid, '127.0.0.1', null, isNaN(item["id"]) ? mongoStats.YEARCRAD2 : mongoStats.YEARCRAD3, item['count']);
                modelUtil.addDropItemToDB(item["id"], item["count"], userUid, item["isPatch"], item["level"], function (err, res) {
                    if (err) {
                        forCb(err);
                    } else {
                        if (res instanceof Array) {
                            for (var i in res) {
                                backItems.push(res);
                            }
                        } else {
                            backItems.push(res);
                        }
                        forCb();
                    }
                });
            }, function (err, res) {
                callback(err, res);
            });
        }, function (callback) {
            if (isVip) {
                userVariable.setVariableTime(userUid, 'yearCardForVipS', -1, jutil.now(), function (err, res) {
                    callback(err, res);
                });
            } else {
                callback();
            }
        }], function (err) {
        callbackFn(err, backItems);
    });
}

/**
 * 发放奖励到邮箱
 */
function rewardToMail(userUid, times, reward, type, callbackFn, language) {
    if (times > 0) {
        if (reward.length > 0) {
            var configData = configManager.createConfig(userUid);
            var mailConfig;
            var mailConfigDefault = configData.getConfig("mail");
            var mailConfigLocal = configData.getConfig("mail" + "_" + language);
            if (mailConfigLocal) {
                mailConfig = mailConfigLocal;
            } else {
                mailConfig = mailConfigDefault;
            }
            var message = "";
            var mailRewardId;
            var rewardX = [];
            var rewardStr = [];
            var rewardIdList = [];
            var rewardNameList = [];
            var rewardList = [];
            for (var x in reward) {
                if (reward[x]["id"] == "ingot") {
                    rewardList.push({"id": "ingot", "count": reward[x]["count"], "name": "伊美加币"});
                } else if (reward[x]["id"] == "gold") {
                    rewardList.push({"id": "gold", "count": reward[x]["count"], "name": "索尼币"});
                } else {
                    var conf;
                    var itemType = reward[x]["id"].substr(0, 2);
                    switch (itemType) {
                        case "10"://hero
                            conf = configData.getConfig("hero");
                            break;
                        case "11"://skill
                            conf = configData.getConfig("skill");
                            break;
                        case 'equip':
                        case "12"://装备
                        case "13"://装备
                        case "14"://装备
                            conf = configData.getConfig("equip");
                            break;
                        case "15"://item
                            conf = configData.getConfig("item");
                            break;
                        case "17"://卡片
                            conf = configData.getConfig("card");
                            break;
                        default :
                            break;
                    }
                    rewardList.push({
                        "id": reward[x]["id"],
                        "count": reward[x]["count"],
                        "name": conf[reward[x]["id"]]["name"]
                    });
                }
            }
            for (var j in rewardList) {
                rewardX.push({"id": rewardList[j]["id"], "count": rewardList[j]["count"] * times});
                rewardStr.push(rewardList[j]["name"] + "*" + rewardList[j]["count"] * times);
                rewardNameList.push(rewardList[j]["name"]);
                rewardIdList.push(rewardList[j]["id"]);
                mongoStats.dropStats(rewardList[j]["id"], userUid, '127.0.0.1', null, isNaN(rewardList[j]["id"]) ? mongoStats.YEARCRAD2 : mongoStats.YEARCRAD3, rewardList[j]["count"]);
            }
            if (type == 0) {
                message = mailConfig["yearCardReward"];
                mailRewardId = mail.getRewardId(times);
            } else {//vip獎勵郵件文字顯示
                message = mailConfig["yearCardRewardForVip"];
                mailRewardId = 0;
            }
            mail.addMail(userUid, -1, message, JSON.stringify(rewardX), mailRewardId, function (err, res) {
                if (err) {
                    callbackFn(err, res);
                } else {
                    if (type == 0) {
                        userVariable.setVariableTime(userUid, 'yearCard', times, jutil.todayTime() + 86400, function (err, res) {
                            callbackFn(err, res);
                        });
                    } else {
                        userVariable.setVariableTime(userUid, 'yearCardForVipS', -1, jutil.now(), function (err, res) {
                            callbackFn(err, res);
                        });
                    }
                }
            });
        } else {
            callbackFn("noReward");
        }
    } else {
        callbackFn();
    }
}

/**
 * 用户登录时检测季卡状态
 */
function login(userUid) {
    var yearCardConfig;
    var times = 0;
    var language = "";
    var vipConfig = {};
    var vipReward = {};
    var userVip = 0;
    var rTAB = false;
    var endTime = 0;
    async.series([
        function (callback) {
            userVariable.getLanguage(userUid, function (err, res) {
                language = res;
                callback(err);
            });
        }, function (callback) {
            getConfig(userUid, function (err, res) {
                if (err || res[2] == null || res[2]["buy"] == undefined) {
                    callback('configError');
                } else {
                    yearCardConfig = res[2]["buy"];
                    vipConfig = res[2]["vipReward"];
                    callback();
                }
            });
        }, function (callback) {
            userVariable.getVariableTime(userUid, 'yearCardForVip', function (err, res) {
                if (res != null && res["value"] != undefined) {
                    userVip = res['value'];
                    vipReward = vipConfig[userVip] == undefined ? [] : vipConfig[userVip];
                    endTime = res["time"] - 0 + 60 * 60 * 24 * 360;
                    callback();
                } else {
                    vipReward = [];
                    callback();
                }
            });
        }, function (callback) {
            userVariable.getVariableTime(userUid, 'yearCard', function (err, res) {
                if (res == null) {
                    rTAB = false;
                    callback();
                } else if (res['value'] != undefined) {
                    if (res['value'] > 0 && jutil.now() >= endTime) {//可以补发
                        times = res['value'];
                        rTAB = true;
                        callback();
                    } else {
                        times = 0;
                        rTAB = false;
                        callback();
                    }
                } else {
                    times = 0;
                    rTAB = false;
                    callback();
                }
            });
        }, function (callback) {
            if (rTAB == true) {
                rewardToMail(userUid, times, yearCardConfig["back"], 0, function (err, res) {
                    callback(err, res);
                }, language);
            } else {
                callback();
            }
        }, function (callback) {
            if (rTAB) {
                async.series([function (clearCb) {
                    userVariable.delVariable(userUid, "yearCardForVip", clearCb);
                }, function (clearCb) {
                    userVariable.delVariable(userUid, "yearCard", clearCb);
                }, function (clearCb) {
                    userVariable.delVariable(userUid, "yearCardForVipS", clearCb);
                }], function (err, res) {
                    callback(err);
                });
            } else {
                callback();
            }
        }
    ], function (err) {
        console.log("year card send finally");
    });
}

//获取用户状态
function getUserData(userUid, sTime, callbackFn) {
    var returnData = {"data": 0, "dataTime": 0, "status": 0, "statusTime": 0, "arg": {}};
    async.series([function (cb) {
        activityData.getActivityData(userUid, activityData.PRACTICE_YEARCARD, function (err, res) {
            if (res != null && res["dataTime"] == sTime) {
                returnData["data"] = res["data"] - 0;
                returnData["status"] = res["status"] - 0;
                returnData["dataTime"] = sTime - 0;
                returnData["statusTime"] = res["statusTime"] - 0;
            }
            cb(err);
        });
    }], function (err, res) {
        callbackFn(err, returnData);
    });
}

//设置用户状态
function setUserData(userUid, data, callbackFn) {
    activityData.updateActivityData(userUid, activityData.PRACTICE_YEARCARD, data, callbackFn);
}

/**
 * 添加充值记录
 */
function addRecord(userUid, pay, callbackFn) {
    var currentConfig = null;
    var qPay = 0;
    async.series([
        function (cb) {// 获取活动配置数据
            getConfig(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    if (res == null || res[2] == undefined || res[2]["buy"] == undefined || res[2]["buy"]["ingot"] == undefined) {
                        cb("configError");
                    } else {
                        currentConfig = res[2];
                        qPay = res[2]["buy"]["ingot"] - 0;
                        cb();
                    }
                }
            });
        },
        function (cb) {// 添加充值记录
            userVariable.setVariableTime(userUid, 'yearCardD', pay, jutil.day(), cb);
        }
    ], function (err) {
        callbackFn();
    });
}

function isWork(userUid, callbackFn) {
    userVariable.getVariableTime(userUid, 'yearCardTAB', function (err, res) {
        if (res != null && res['value'] == "360" && res['time'] > jutil.todayTime()) {
            callbackFn(1);
        } else {
            callbackFn(0);
        }
    });
}


exports.reward = reward;
exports.rewardToMail = rewardToMail;
exports.login = login;
exports.getConfig = getConfig;
exports.getUserData = getUserData;
exports.setUserData = setUserData;
exports.addRecord = addRecord;
exports.isWork = isWork;