/**
 * Created by xiayanxin on 2016/9/28.
 *
 * 左聯 右聯 內聯 總有一款適合你
 */

var mysql = require("../code/alien/db/mysql");
var async = require("async");
var bitUtil = require("../code/alien/db/bitUtil");
var fs = require("fs");
var countryList = ['r'];
var sql;
var dataSwap;
var csv = "country,city,userUid,userName,platformId,\n";
//sql = "SELECT * FROM `user` WHERE `vip` >= 5;";
sql = "SELECT * FROM `user` a LEFT JOIN `variable` b ON a.`userUid` = b.`userUid` AND a.`vip` >= 5 WHERE b.`name` = 'loginLog' and b.`time` between 1445443200 and 1446220799;";
//sql = "SELECT * FROM `user` as a,`variable` as b WHERE a.`userUid` = b.`userUid` and a.`vip` >= 5 and b.`name` = 'loginLog' and b.`time` between 1445443200 and 1446220799;";
//sql = "SELECT * FROM `user` as a Right Join `variable` as b on a.`userUid` = b.`userUid` where a.`vip` >= 5 and b.`name` = 'loginLog' and b.`time` between 1472443200 and 1475134700;";
//sql = "SELECT *  FROM `user` as a,`variable` as b WHERE a.`ingot` > 50000 and a.`userUid` = b.`userUid` and b.`name` = 'loginLog' and b.`value` > 1444924800";
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
    async.forEachSeries(cityList, function (city, cb) {
        async.series([function (queueCb) {
            mysql.game(null, country, city).query(sql, function (err, res) {
                if (err) {
                    queueCb(err);
                } else {
                    dataSwap = res;
                    queueCb();
                    //mysql.game(null, country, city).end(queueCb); // if no db connect request later
                }
            });
        }, function (queueCb) {
            for (var i in dataSwap) {
                var item = dataSwap[i];
                var rowArr = [];
                rowArr.push(country);
                rowArr.push(city);
                rowArr.push(item["userUid"]);
                rowArr.push(item["lv"]);
                rowArr.push(item["vip"]);
                rowArr.push(item["platformId"]);
                rowArr.push(item["pUserId"]);
                rowArr.push(item["time"]);
                csv += rowArr.join(",");
                csv += "\n";
            }
            queueCb();
        }], function (err, res) {
            console.log(country, city, 'end');
            cb(err);
        });
    }, function (err) {
        console.log(country, 'end');
        forCb(err);
    });
}, function (err) {
    console.log(err);
    fs.writeFileSync("tableExport.csv", csv);
    process.exit();
});