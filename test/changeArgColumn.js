/**
 * Created by xiazhengxin on 2017/5/18.
 */

var mysql = require("../code/alien/db/mysql");
var async = require("async");
var countryList = ['t'];
var sql = "";

async.forEachSeries(countryList, function (country, forCb) {
    console.log(country, 'start');
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for (var city in serverList) {
        cityList.push(city);
    }
    async.forEachSeries(cityList, function (city, cb) {
        async.series([function (queueCb) {
            sql = "ALTER TABLE `activityData` CHANGE `arg` `arg` TEXT CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '额外的参数';";
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
            queueCb();
        }, function (queueCb) {
            sql = "DELETE FROM `activityData` WHERE `activityData`.`type` = 45";
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