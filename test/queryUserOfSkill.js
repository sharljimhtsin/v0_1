/**
 * Created by xiazhengxin on 2017/4/7.
 */

var mysql = require("../code/alien/db/mysql");
var user = require("../code/model/user");
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
    var argList = [114072];
    var inStr = argList.join(",");
    async.forEachSeries(cityList, function (city, cb) {
        async.series([function (queueCb) {
            sql = "SELECT * FROM `skill` WHERE `skillId` in (" + argList + ")";
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
        }, function (queueCb) {// for small data
            async.eachSeries(dataSwap, function (item, uCb) {
                user.getUser(item["userUid"], function (err, res) {
                    var rowArr = [];
                    rowArr.push(country);
                    rowArr.push(city);
                    rowArr.push(item["userUid"]);
                    rowArr.push(item["heroUid"]);
                    rowArr.push(item["heroId"]);
                    rowArr.push(res["vip"]);
                    csv += rowArr.join(",");
                    csv += "\n";
                    uCb(err);
                });
            }, function (err, res) {
                queueCb(err);
            });
        }, function (queueCb) {// for huge data
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
    fs.writeFileSync("skill.csv", csv);
    process.exit();
});