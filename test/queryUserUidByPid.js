/**
 * Created by xiayanxin on 2016/10/14.
 */

var mysql = require("../code/alien/db/mysql");
var async = require("async");
var fs = require("fs");
var countryList = ['i'];
var sql;
var csv = "country,city,userUid,userName,platformId,\n";
var dataSwap;

async.forEachSeries(countryList, function (country, forCb) {
    console.log(country, 'start');
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for (var city in serverList) {
        cityList.push(city);
    }
    async.forEachSeries(cityList, function (city, cb) {
        async.series([function (queueCb) {
            sql = "select userUid,userName,platformId,pUserId from user where pUserId in (1131289);";
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
            async.eachSeries(dataSwap, function (item, uCb) {
                var rowArr = [];
                rowArr.push(country);
                rowArr.push(city);
                rowArr.push(item["userUid"]);
                rowArr.push(item["userName"]);
                rowArr.push(item["platformId"]);
                rowArr.push(item["pUserId"]);
                csv += rowArr.join(",");
                csv += "\n";
                uCb();
            }, function (err, res) {
                queueCb(err);
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
    fs.writeFileSync("tableExport.csv", csv);
    process.exit();
});