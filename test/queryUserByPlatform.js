/**
 * Created by xiazhengxin on 2016/12/26.
 */

var mysql = require("../code/alien/db/mysql");
var async = require("async");
var fs = require("fs");
var countryList = ['r'];
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
            sql = "select * from user as a left join variable as b on a.userUid = b.userUid where a.platformId in ('ara','araa','aragp') and b.name = 'loginLog';";
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
                rowArr.push(item["lv"]);
                rowArr.push(item["gold"]);
                rowArr.push(item["ingot"]);
                rowArr.push(item["vip"]);
                rowArr.push(item["platformId"]);
                rowArr.push(item["pUserId"]);
                rowArr.push(timeToData(item["createTime"]));
                rowArr.push(timeToData(item["time"]));
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

function timeToData(time) {
    var date;
    if (time < 2406312) {
        date = new Date(time * 1000 * 1000);
    } else {
        date = new Date(time * 1000);
    }
    var t = date.getFullYear() + "/";
    t += (date.getMonth() + 1) + "/";
    t += date.getDate() + " ";
    t += date.getHours() + ":";
    t += date.getMinutes() + ":";
    t += date.getSeconds();
    return t;
}