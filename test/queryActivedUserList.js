/**
 * Created by xiazhengxin on 2017/3/22.
 */

var jutil = require("../code/utils/jutil");
var async = require("async");
var redis = require("../code/alien/db/redis");
var mysql = require("../code/alien/db/mysql");
var fs = require("fs");
var countryList = ['r'];
var dataSwap;
var csv = "country,city,userUid,userName,platformId,\n";
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
            var oneMonthAgo = now - 60 * 60 * 24 * 30;
            var sql = "SELECT * FROM `variable` as v,`user` as u WHERE u.`userUid` = v.`userUid` and v.`name` = 'loginLog' and v.`time` > " + oneMonthAgo;
            mysql.game(null, country, city).query(sql, function (err, res) {
                if (err) {
                    console.log(city, err);
                    queueCb();
                } else {
                    dataSwap = res;
                    queueCb();
                    //mysql.game(null, country, city).end(queueCb); // if no db connect request later
                }
            });
        }, function (queueCb) {
            for (var row in dataSwap) {
                row = dataSwap[row];
                var rowArr = [];
                rowArr.push(country);
                rowArr.push(city);
                rowArr.push(row["userUid"]);
                rowArr.push(row["userName"]);
                rowArr.push(row["lv"]);
                rowArr.push(row["vip"]);
                rowArr.push(row["platformId"]);
                rowArr.push(row["pUserId"]);
                rowArr.push(row["name"]);
                rowArr.push(row["time"]);
                csv += rowArr.join(",");
                csv += "\n";
            }
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
    fs.writeFileSync("Active.csv", csv);
    console.log("OK");
    process.exit();
});
