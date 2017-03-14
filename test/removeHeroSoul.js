/**
 * Created by xiazhengxin on 2017/3/5.
 */

var mysql = require("../code/alien/db/mysql");
var redis = require("../code/alien/db/redis");
var async = require("async");
var fs = require("fs");
var countryList = ['r'];
var sql;

async.forEachSeries(countryList, function (country, forCb) {
    console.log(country, 'start');
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for (var city in serverList) {
        cityList.push(city);
    }
    async.forEachSeries(cityList, function (city, cb) {
        async.series([function (queueCb) {
            sql = "DELETE FROM `heroSoul` WHERE `heroId` = 104041";
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
