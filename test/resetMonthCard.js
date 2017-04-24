/**
 * Created by xiazhengxin on 2017/3/27.
 */

var jutil = require("../code/utils/jutil");
var async = require("async");
var redis = require("../code/alien/db/redis");
var mysql = require("../code/alien/db/mysql");
var fs = require("fs");
var countryList = ['r'];
async.forEachSeries(countryList, function (country, forCb) {
    console.log(country, 'start');
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for (var city in serverList) {
        cityList.push(city);
    }
    async.forEachSeries(cityList, function (city, cb) {
        async.series([function (queueCb) {
            var now = jutil.now();
            var oneWeekAgo = now - 60 * 60 * 24 * 7;
            var twoDaysAgo = now - 60 * 60 * 24 * 2;
            var sql = "UPDATE `variable` SET `time` = " + twoDaysAgo + " WHERE `name` = 'monthCard' and `time` > " + oneWeekAgo;
            mysql.game(null, country, city).query(sql, function (err, res) {
                if (err) {
                    console.log(city, err);
                    queueCb();
                } else {
                    console.log(res);
                    queueCb();
                    //mysql.game(null, country, city).end(queueCb); // if no db connect request later
                }
            });
        }, function (queueCb) {
            queueCb();
        }, function (queueCb) {
            queueCb();
        }, function (queueCb) {
            queueCb();
        }, function (queueCb) {
            queueCb();
        }], function (err, res) {
            cb();
        });
    }, function (err) {
        console.log(country, 'end');
        forCb();
    });
}, function (err) {
    console.log("OK");
    process.exit();
});