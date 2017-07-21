/**
 * Created by xiazhengxin on 2017/6/8.
 */

var async = require("async");
var mysql = require("../code/alien/db/mysql");
var user = require("../code/model/user");
var fs = require("fs");
var countryList = ['r'];
var csv = "";
var type = 69;
async.forEachSeries(countryList, function (country, forCb) {
    console.log(country, 'start');
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for (var city in serverList) {
        if (serverList[city].hasOwnProperty("merge")) {
            continue;
        }
        cityList.push(city);
    }
    var swapData;
    async.forEachSeries(cityList, function (city, cb) {
        async.series([function (queueCb) {
            var sql = "SELECT *  FROM `activityData` WHERE `type` = " + type;
            mysql.game(null, country, city).query(sql, function (err, res) {
                if (err) {
                    console.log(city, err);
                    queueCb();
                } else {
                    swapData = res;
                    queueCb();
                    //mysql.game(null, country, city).end(queueCb); // if no db connect request later
                }
            });
        }, function (queueCb) {
            async.eachSeries(swapData, function (item, uCb) {
                var rowArr = [];
                rowArr.push(country);
                rowArr.push(city);
                rowArr.push(item["userUid"]);
                user.getUserDataFiled(item["userUid"], "lv", function (err, res) {
                    rowArr.push(res);
                    rowArr.push(item["type"]);
                    rowArr.push(item["data"]);
                    rowArr.push(item["dataTime"]);
                    rowArr.push(item["status"]);
                    rowArr.push(item["statusTime"]);
                    rowArr.push(item["arg"]);
                    csv += rowArr.join(",");
                    csv += "\n";
                    uCb(err);
                });
            }, function () {
                queueCb();
            });
        }, function (queueCb) {
            queueCb();
        }, function (queueCb) {
            queueCb();
        }, function (queueCb) {
            queueCb();
        }], function () {
            cb();
        });
    }, function () {
        console.log(country, 'end');
        forCb();
    });
}, function () {
    fs.writeFileSync("actDataLog_" + type + ".csv", csv);
    console.log("OK");
    process.exit();
});