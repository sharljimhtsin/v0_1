/**
 * Created by xiayanxin on 2016/11/1.
 *
 * 封印補發腳本
 */

var mysql = require("../code/alien/db/mysql");
var redis = require("../code/alien/db/redis");
var async = require("async");
var fs = require("fs");
var jutil = require("../code/utils/jutil");
var bitUtil = require("../code/alien/db/bitUtil");
var login = require("../code/model/login");
var userVariable = require("../code/model/userVariable");
var mail = require("../code/model/mail");
var configManager = require("../code/config/configManager");
var rs = new Response();

function Response() {
    // nothing
}
Response.prototype.echo = function (str1, str2) {
    console.log(str1, str2);
};

var country = "i";
var daysAgo = 2;

login.getServerCitys(country, 0, function (err, res) {
    async.eachSeries(res, function (city, cb) {
        anAward(country, city, cb);
    }, function (err) {
        console.log(err);
    });
});

function anAward(country, city, callbackFn) {
    var rDB = redis.dynamic(country, city);
    async.series([
        function (cb) {
            getTopTwenty(rDB, "top5", jutil.day() - daysAgo, function (err, res) {
                if (err || res == null) {
                    var errorMessage = "kind:top5  " + "country:" + country + "   " + "city:" + city;
                    console.log(errorMessage);
                    cb();
                } else {
                    sendReward(res, country, city, "5", cb);
                }
            });
        },
        function (cb) {
            getTopTwenty(rDB, "top6", jutil.day() - daysAgo, function (err, res) {
                if (err || res == null) {
                    var errorMessage = "kind:top6  " + "country:" + country + "   " + "city:" + city;
                    console.log(errorMessage);
                    cb();
                } else {
                    sendReward(res, country, city, "6", cb);
                }
            });
        },
        function (cb) {
            getTopTwenty(rDB, "top7", jutil.day() - daysAgo, function (err, res) {
                if (err || res == null) {
                    var errorMessage = "kind:top7  " + "country:" + country + "   " + "city:" + city;
                    console.log(errorMessage);
                    cb();
                } else {
                    sendReward(res, country, city, "7", cb);
                }
            });
        },
        function (cb) {
            getTopTwenty(rDB, "top8", jutil.day() - daysAgo, function (err, res) {
                if (err || res == null) {
                    var errorMessage = "kind:top8  " + "country:" + country + "   " + "city:" + city;
                    console.log(errorMessage);
                    cb();
                } else {
                    sendReward(res, country, city, "8", cb);
                }
            });
        }
    ], function (err, res) {
        callbackFn();
    });
}

function getTopTwenty(redisT, type, day, callBack) { //获取前二十名
    var getKey = type + ":" + day;
    var redisItem = redisT.z(getKey);
    redisItem.revrange(0, 19, "WITHSCORES", function (err, res) {
        var returnData = [];
        res = res || [];
        for (var i = 0; i < res.length / 2; i++) {
            var obj = {};
            obj["top"] = i + 1;
            obj["value"] = res[i * 2 + 1];
            obj["userId"] = res[i * 2];
            returnData.push(obj);
        }
        callBack(null, returnData);
    });
}

function sendReward(userArr, country, city, key, callbackFn) {
    var config = configManager.createConfigFromCountry(country);
    var bloodConfig = config.getConfig("bloodBattle");
    var bloodBattleFormationSize = bloodConfig["bloodBattleFormationSize"];
    var rewardItem = bloodBattleFormationSize[key];
    var rankReward = rewardItem["rankReward"];
    async.eachSeries(userArr, function (item, callbackEach) {
        var userUid = item["userId"];
        var top = item["top"];
        var reward = [];
        var rankRewardItem = rankReward[top];
        var ingot = rankRewardItem["imegga"] ? rankRewardItem["imegga"] : 0;
        var gold = rankRewardItem["zeniReward"] ? rankRewardItem["zeniReward"] : 0;
        reward.push({"id": "gold", "count": gold});
        reward.push({"id": "ingot", "count": ingot});
        sendRewardItem(userUid, "top" + key, reward, config, function (err, res) {
            if (err) {
                var errorMessage = "kind:top8   " + "top:" + key + "      " + "country:" + country + "   " + "city:" + city;
                console.log(errorMessage);
            }
            callbackEach();
        });
    }, function (err, res) {
        callbackFn();
    });
}

function sendRewardItem(userUid, type, reward, config, cb) {
    var lang;
    async.series([
        function (callBack) {
            userVariable.getLanguage(userUid, function (err, res) {
                lang = res;
                callBack(err);
            });
        },
        function (callBack) { //未发奖励，发放奖励
            var mailConfig;
            var mailConfigDefault = config.getConfig("mail");
            var mailConfigLocal = config.getConfig("mail" + "_" + lang);
            if (mailConfigLocal) {
                mailConfig = mailConfigLocal;
            } else {
                mailConfig = mailConfigDefault;
            }
            var bloodBattleRankReward = mailConfig["bloodBattleRankReward"];
            mail.addMail(userUid, -1, bloodBattleRankReward, JSON.stringify(reward), "666", function (err, res) {
                callBack(err);
            })
        }
    ], function (err, res) {
        cb(err, res);
    });
}