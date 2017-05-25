/**
 * Created by xiazhengxin on 2016/12/1.
 */

var bej = require("../code/model/practiceBejeweled");
var login = require("../code/model/login");
var jutil = require("../code/utils/jutil");
var async = require("async");
var configManager = require("../code/config/configManager");
var userVariable = require("../code/model/userVariable");
var activityData = require("../code/model/activityData");
var mail = require("../code/model/mail");
var redis = require("../code/alien/db/redis");
var mysql = require("../code/alien/db/mysql");

login.getServerCitys("r", 0, function (err, res) {
    if (err) {
        console.log(jutil.formatTime("Y-m-d H:i:s", jutil.now()));
    }
    async.eachSeries(res, function (city, cb) {
        bejDataRefresh("r", city, function (err, res) {
            console.log("doing", city, err, res);
            cb();
        });
    }, function (err, res) {
        console.log("end", err, res);
    });
});


//宝石迷阵：过凌晨刷新数据
function bejDataRefresh(country, city, callbackFn) {
    var users;
    var activityType = activityData.BEJEWELED;
    var config = configManager.createConfigFromCountry(country);
    var sql = "SELECT `userUid` FROM activityData WHERE type=" + mysql.escape(activityType);
    var rDB = redis.dynamic(country, city);
    var getKey = "cronRun:bejeweled" + ":" + jutil.day();
    rDB.s(getKey).setnx(jutil.now(), function (err, res) {
        //if (err || res == 0) {
        if (err) {
            console.log("SKIP");
            callbackFn();
        } else {
            async.series([function (cb) {
                mysql.game(null, country, city).query(sql, function (err, res) {
                    users = res;
                    cb(err);
                });
            }, function (cb) {//发送邮件奖励
                async.eachSeries(users, function (item, eCb) {
                    bejSetReward(item["userUid"], config, eCb);
                }, function (err, res) {
                    cb(err);
                });
            }, function (cb) {
                async.eachSeries(users, function (item, eCb) {//1.刷新数据 删除排行榜
                    bejFresh(item["userUid"], eCb);
                }, function (err, res) {
                    cb(err);
                });
            }], function (err, res) {
                callbackFn(err);
            });
        }
    });
}

//宝石迷阵 发奖
function bejSetReward(userUid, config, callbackFn) {
    var currentConfig;
    var rankReward = {};
    var rankList = [];
    var lang;
    var top = 0;
    var kkkk = false;
    async.series([function (cb) {//取配置
        bej.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                currentConfig = res[2];
                rankReward = currentConfig["rankReward"];
                cb();
            }
        });
    }, function (cb) {
        userVariable.getLanguage(userUid, function (err, res) {
            lang = res;
            cb(err);
        });
    }, function (cb) {
        bej.getRankList(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res == null || res[0] == undefined) {
                    cb();
                } else {
                    rankList = res;
                    for (var x in rankList) {
                        if (rankList[x]["userUid"] == userUid) {//进榜了。。
                            kkkk = true;
                            top = x - 0 + 1;
                            break;
                        }
                    }
                    cb();
                }
            }
        });
    }, function (cb) {//发邮件
        if (kkkk == true) {
            var reward = [];
            for (var w in rankReward[top]) {
                reward.push({"id": rankReward[top][w]["id"], "count": rankReward[top][w]["count"]});
            }
            var mailConfig;
            var mailConfigDefault = config.getConfig("mail");
            var mailConfigLocal = config.getConfig("mail" + "_" + lang);
            if (mailConfigLocal) {
                mailConfig = mailConfigLocal;
            } else {
                mailConfig = mailConfigDefault;
            }
            var bejeweledRankReward = mailConfig["bejeweledRankReward"];
            mail.addMail(userUid, -1, bejeweledRankReward, JSON.stringify(reward), "111111", function (err, res) {
                cb(err);
            });
        } else {
            cb();
        }
    }], function (err, res) {
        callbackFn();
    });
}

//宝石迷阵 时间点刷新数据
function bejFresh(userUid, callbackFn) {
    var returnData = {};//返回用户初始化数据集合
    var currentConfig;//配置
    var bejeweledType = 0;
    var bejeweledLine = 0;
    var bejData = {};
    var key = "";
    var curfreeStep = 0;
    var bejList = [];
    async.series([function (cb) {
        bej.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                currentConfig = res[2];
                bejeweledType = currentConfig["bejeweledType"] - 0;
                bejeweledLine = currentConfig["bejeweledLine"] - 0;
                key = currentConfig["key"];
                returnData["config"] = currentConfig;
                curfreeStep = currentConfig["freeStep"] - 0;
                cb();
            }
        });
    }, function (cb) {//随机生成【0-5】,5组的二位数组
        bejList = bej.checkedUnRepeat(bejeweledLine, bejeweledType);
        cb();
    }, function (cb) {
        bejData = {
            "bejList": [],
            "point": 0,
            "step": 0,
            "buyStepTimes": 0,
            "specialStatusList": [],
            "ghostStatus": 0,
            "rankStatus": 0,
            "ghostTimes": 0,
            "recordList": [],
            "rankList": []
        };
        bejData["bejList"] = bejList;
        bejData["step"] = curfreeStep;
        cb();
    }, function (cb) {//过凌晨初始化数据
        bej.setUserData(userUid, bejData, cb);
    }, function (cb) {//过凌晨清除排行榜
        bej.del(userUid, cb);
    }], function (err, res) {
        callbackFn();
    });
}