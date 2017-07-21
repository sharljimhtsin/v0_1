/**
 * Created by xiazhengxin on 2017/5/30.
 */

var mysql = require("../code/alien/db/mysql");
var async = require("async");
var countryList = ['r'];
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
            sql = "ALTER TABLE `league` CHANGE `leagueName` `leagueName` VARCHAR( 20 ) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL;";
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
        }, function (queueCb) {
            queueCb();
        }, function (queueCb) {
            queueCb();
        }], function (err) {
            console.log(country, city, 'end');
            cb(err);
        });
    }, function () {
        console.log(country, 'end');
        forCb();
    });
}, function () {
    process.exit();
});