var mysql = require('mysql');
var async = require('async');
var fs = require('fs');

var conn = mysql.createPool({"host": "dbztest.gt.com", "user": "admin", "password": "zxw000123", "port": 3306});
//var conn = mysql.createPool({"host": "127.0.0.1", "user": "root", "password": "dragonball", "port": 3306});
//var conn = mysql.createPool({"host": "10.57.20.30", "user": "dragonball", "password": "VGHPcg)f^vn821", "port": 3306});
fs.writeFile('tableUsa160512.csv', "userUid,platformId,pUserId,time\n");

var total = 0;
var offset = 0;
var limit = 1000;
var totalHit = 0;
var totalMiss = 0;
var dbs = '';
async.series([
    function (cb) {
        var sql = "show databases;";
        var str = 'dragongame';
        conn.query(sql, function (err, res) {
            if (res && res.length > 0) {
                async.eachSeries(res, function (obj, callback) {
                    async.series([
                        function (innerCb) {
                            var result = obj["Database"];
                            if (result.indexOf(str) >= 0) {
                                console.log("use " + result);
                                dbs = obj["Database"];
                                var sql1 = "select count(*) as total from `" + dbs + "`.user";
                                console.log(sql1);
                                conn.query(sql1, function (err, res) {
                                    if (res && res.length > 0) {
                                        total = res[0]["total"];
                                        offset = 0;
                                        console.log("total is " + total);
                                        innerCb(err);
                                    } else {
                                        innerCb(err);
                                    }
                                });
                            } else {
                                innerCb(null);
                            }
                        }, function (innerCb) {
                            async.whilst(function () {
                                return offset < total;
                            }, function (wCb) {
                                var sql2 = "select * from `" + dbs + "`.user limit " + offset + "," + limit + ";";
                                console.log(sql2);
                                conn.query(sql2, function (err, res) {
                                    if (res && res.length > 0) {
                                        console.log("count is " + res.length);
                                        var csv = "";
                                        var hit = 0;
                                        var miss = 0;
                                        async.eachSeries(res, function (obj1, callbackFn) {
                                            var rowArr = [];
                                            rowArr.push(obj1["userUid"]);
                                            rowArr.push(obj1["platformId"]);
                                            rowArr.push(obj1["pUserId"]);
                                            var sql3 = "select `time` from `" + dbs + "`.`variable` where `name` = 'loginLog' and `userUid` = '" + obj1["userUid"] + "';";
                                            conn.query(sql3, function (err, res) {
                                                if (res && res.length > 0) {
                                                    for (var i in res) {
                                                        rowArr.push(res[i]["heroId"]);
                                                        rowArr.push(res[i]["time"]);
                                                        csv += rowArr.join(",");
                                                        csv += "\n";
                                                    }
                                                    hit++;
                                                    callbackFn(err);
                                                } else {
                                                    miss++;
                                                    callbackFn(err);
                                                }
                                            });
                                        }, function (err, res) {
                                            offset += limit;
                                            fs.appendFile('tableUsa160512.csv', csv);
                                            totalHit += hit;
                                            totalMiss += miss;
                                            console.log("hit is " + hit, "miss is " + miss);
                                            wCb(err);
                                        });
                                    } else {
                                        wCb();
                                    }
                                });
                            }, function (err, res) {
                                innerCb(err);
                            });
                        }
                    ], function (err, res) {
                        callback(err);
                    });
                }, function (err, res) {
                    cb(err);
                });
            } else {
                cb(err);
            }
        });
    }
], function (err, res) {
    console.log("total hit is " + totalHit, "total miss is " + totalMiss);
    console.log("end", err);
    process.exit(0);
});