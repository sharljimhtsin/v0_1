/**
 * Created by xiayanxin on 2016/10/26.
 */

var mysql = require("../code/alien/db/mysql");
var user = require("../code/model/user");
var async = require("async");
var fs = require("fs");

var countryList = ['r'];
var csv = "大区,分区,userUid,uin, 伊美加币, 充值额, 订单类型,创建时间,状态\n";
var sql = 'SELECT * FROM  `payOrder` WHERE  `orderMoney` >0 ';
var argList = ["'36efce387d027405c654f536388ce3a7'", "'3b9180b48c5bba2792dc29d46a5755ef'", "'dda3188ce52b5b7d0cfe7bec135829f1'"];
var argStr = argList.join(",");
sql += (" and `orderNo` in (" + argStr + ")");
async.forEachSeries(countryList, function (country, forCb) {
    console.log(country, 'start');
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for (var city in serverList) {
        cityList.push(city);
    }
    async.forEachSeries(cityList, function (city, cb) {
        console.log(country, city, 'start');
        mysql.game(null, country, city).query(sql, function (err, res) {
            if (err) {
                console.log(city, err);
                cb();
            } else {
                async.eachSeries(res, function (rowData, esCb) {
                    var rowArr = [];
                    rowArr.push(country);
                    rowArr.push(city);
                    rowArr.push(rowData["userUid"]);
                    rowArr.push(rowData["orderNo"]);
                    rowArr.push(rowData["uin"]);
                    rowArr.push(rowData["platformId"]);
                    rowArr.push(rowData["goodsCount"]);
                    rowArr.push(rowData["orderMoney"]);
                    rowArr.push(rowData["productId"]);
                    rowArr.push(timeToData(rowData["createTime"]));
                    rowArr.push(rowData["status"]);
                    rowArr.push(rowData["order_id"]);
                    user.getUser(rowData["userUid"], function (err, res) {
                        rowArr.push(res["pUserId"]);
                        rowArr.push(res["platformId"]);
                        csv += rowArr.join(",");
                        csv += "\n";
                        esCb();
                    });
                }, function (err, res) {
                    console.log(country, city, 'end');
                    cb();
                });
            }
        });
    }, function (err) {
        console.log(country, 'end');
        forCb();
    });
}, function (err) {
    console.log('write file start');
    fs.writeFileSync("payOrder.csv", csv);
    console.log('write file end');
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