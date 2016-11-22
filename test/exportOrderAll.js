/**
 * Created by xiazhengxin on 2016/11/15.
 */

var mysql = require("../code/alien/db/mysql");
var async = require("async");
var fs = require("fs");

var countryList = ['r'];
var csv = "大区,分区,userUid,uin, 伊美加币, 充值额, 订单类型,创建时间,状态\n";
var sql = "SELECT sum(`orderMoney`) as a,sum(`goodsCount`) as b,`userUid`,count(*) as c FROM `payOrder` WHERE `orderMoney` >0 and `uin` != 'test' group by `userUid` UNION select ingot,gold,userUid,pUserId from user";
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
                var tmpArr = {};
                async.eachSeries(res, function (rowData, esCb) {
                    var rowArr;
                    if (tmpArr.hasOwnProperty(rowData["userUid"])) {
                        rowArr = tmpArr[rowData["userUid"]];
                    } else {
                        rowArr = [];
                        rowArr.push(country);
                        rowArr.push(city);
                        rowArr.push(rowData["userUid"]);
                    }
                    rowArr.push(rowData["a"]);
                    rowArr.push(rowData["b"]);
                    rowArr.push(rowData["c"]);
                    tmpArr[rowData["userUid"]] = rowArr;
                    esCb();
                }, function (err, res) {
                    for (var tmp in tmpArr) {
                        tmp = tmpArr[tmp];
                        if (tmp.length == 9) {
                            csv += tmp.join(",");
                            csv += "\n";
                        }
                    }
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
    fs.writeFileSync("payOrderAll.csv", csv);
    console.log('write file end');
    process.exit();
});