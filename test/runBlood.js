/**
 * 激戰補發腳本
 */

var mysql = require("../code/alien/db/mysql");
var redis = require("../code/alien/db/redis");
var configManager = require("../code/config/configManager");
var async = require("async");
var fs = require("fs");
var jutil = require("../code/utils/jutil");
var bitUtil = require("../code/alien/db/bitUtil");
var login = require("../code/model/login");
var pvptop = require("../code/model/pvptop");
var mail = require("../code/model/mail");
var rs = new Response();

function Response() {
    // nothing
}
Response.prototype.echo = function (str1, str2) {
    console.log(str1, str2);
};

var country = "i";

login.getServerCitys(country, 0, function (err, res) {
    async.eachSeries(res, function (city, cb) {
        pvpReward(country, city, cb);
    }, function (err, res) {
        console.log(err, res, "OK");
    });
});

function pvpReward(county, city, callbackFn) {
    var configData = configManager.createConfigFromCountry(county);
    var dailyReward = configData.getConfig("pvpRankDailyReward");
    var mailConfig = configData.getConfig("mail");
    var limitValue = 0;
    var userList = [];
    for (var c in dailyReward) {
        limitValue++;
    }
    async.series([
        function (cb) { //缓存Limit数据
            pvptop.toTopLimit(county, city, limitValue, function (err, res) {
                cb(err);
            });
        },
        function (cb) { //取Limit数据
            pvptop.getTopLimit(county, city, limitValue, function (err, res) {
                userList = res;
                cb(err);
            });
        },
        function (cb) { // 发奖励
            var pvpRankDailyReward = mailConfig["pvpRankDailyReward"];
            async.eachSeries(Object.keys(userList), function (key, esCb) {
                var pvpUser = userList[key];
                if (pvpUser["robot"] == "0") {
                    if (dailyReward[pvpUser["top"]]) {
                        mail.addMail(pvpUser["userUid"], -1, pvpRankDailyReward, JSON.stringify(dailyReward[pvpUser["top"]]), jutil.day(), function (err, res) {
                            console.log("pvpReward:", "mail.addMail", err);
                            esCb();
                        });
                    } else {
                        esCb();
                    }
                } else {
                    esCb();
                }
            }, function (err) {
                cb();
            });
        }
    ], function (err, res) {
        callbackFn();
    });
}