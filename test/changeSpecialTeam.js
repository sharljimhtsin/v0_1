/**
 * Created by xiazhengxin on 2017/8/4.
 */

var mysql = require("../code/alien/db/mysql");
var async = require("async");
var countryList = ['d'];
var sql = "";
var data;

async.forEachSeries(countryList, function (country, forCb) {
    console.log(country, 'start');
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for (var city in serverList) {
        cityList.push(city);
    }
    async.forEachSeries(cityList, function (city, cb) {
        async.series([function (queueCb) {
            sql = "ALTER TABLE `specialTeam` CHANGE `strong` `strong` INT( 4 ) NOT NULL";
            mysql.game(null, country, city).query(sql, function (err, res) {
                if (err) {
                    console.log(city, err);
                    queueCb();
                } else {
                    queueCb();
                    //mysql.game(null, country, city).end(queueCb); // if no db connect request later
                }
            });
        }, function (queueCb) {
            sql = "SELECT *  FROM `specialTeam` WHERE `level` > 40";
            mysql.game(null, country, city).query(sql, function (err, res) {
                if (err) {
                    console.log(city, err);
                    queueCb();
                } else {
                    data = res;
                    queueCb();
                    //mysql.game(null, country, city).end(queueCb); // if no db connect request later
                }
            });
        }, function (queueCb) {
            async.eachSeries(data, function (item, eCb) {
                var strong;
                async.series([function (doCb) {
                    var configManager = require("../code/config/configManager");
                    var configData = configManager.createConfig(item["userUid"]);
                    var config = configData.getConfig("specialTeam");
                    var levelUpConfig = config["level"][item["level"]];
                    var len = levelUpConfig["randomValue"].length;
                    //是否升级
                    var r = Math.floor(Math.random() * len);
                    if (levelUpConfig["randomValue"][r + 1] != undefined)
                        r++;
                    else if (levelUpConfig["randomValue"][r - 1] != undefined)
                        r--;
                    strong = levelUpConfig["randomValue"][r] * 100;
                    doCb();
                }, function (doCb) {
                    sql = "UPDATE `specialTeam` SET `strong` = " + strong + " WHERE `userUid` = " + item["userUid"] + " and `position` = " + item["position"];
                    console.log(sql);
                    mysql.game(null, country, city).query(sql, function (err, res) {
                        if (err) {
                            console.log(city, err);
                            doCb();
                        } else {
                            doCb();
                        }
                    });
                }, function (doCb) {
                    var redis = require("../code/alien/db/redis");
                    redis.user(item["userUid"]).h("specialTeam").del(doCb);
                }], eCb);
            }, queueCb);
        }, function (queueCb) {
            queueCb();
        }, function (queueCb) {
            queueCb();
        }, function (queueCb) {
            queueCb();
        }], function (err, res) {
            console.log(country, city, 'end');
            cb(err);
        });
    }, function (err) {
        console.log(country, 'end');
        forCb();
    });
}, function (err) {
    console.log(err);
    process.exit();
});