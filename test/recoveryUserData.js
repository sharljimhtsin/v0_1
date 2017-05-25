/**
 * Created by xiazhengxin on 2017/5/11.
 */

var redis = require("../code/alien/db/redis");
var mysql = require("../code/alien/db/mysql");
var bitUtil = require("../code/alien/db/bitUtil");
var mail = require("../code/model/mail");
var async = require("async");
var mysqlLib = require('mysql');
/*
 *
 曾祥威(曾祥威) 00:34:14
 七龙珠北美2017032800备份还原
 http://sqlcon.gt.com
 50.97.63.53:3306
 user:dragonball
 passwd:VGHPcg)f^vn821

 *
 * */
var conn = mysqlLib.createPool({
    "host": "10.57.20.28",
    "user": "dragonball",
    "password": "VGHPcg)f^vn821",
    "port": 3306
});
var userList = [];
var swapData;
var db_prefix = "dragongame_";
var db_tag = "1";
var db_postfix = "_2017050800";
var tables = ["user", "hero", "skill", "item", "equipment"];//金币英雄技能道具装备
var keys = {"user": "h_user", "hero": "heroHash", "skill": "skill", "item": "item", "equipment": "equipment"};//金币英雄技能道具装备
async.series([function (userListCb) {
    var db = db_prefix + db_tag + db_postfix;
    var sql = "SELECT userUid FROM `" + db + "`.`user`";
    conn.query(sql, function (err, res) {
        swapData = res;
        userListCb(err);
        console.log(sql, err);
    });
}, function (userListCb) {
    var count = 1;
    for (var row in swapData) {
        userList.push(swapData[row]["userUid"]);
        console.log(swapData[row]["userUid"], count);
        count++;
    }
    userListCb();
}], function (err, res) {
    console.log(err, res);
    async.forEachSeries(userList, function (userUid, cb) {
        var mCode = bitUtil.parseUserUid(userUid);
        var db = db_prefix + mCode[1] + db_postfix;
        async.eachSeries(tables, function (tb, next) {
            var isUserTable = (tb == "user");
            async.series([function (queueCb) {
                var sql = "SELECT * FROM `" + db + "`.`" + tb + "` WHERE `userUid` = " + userUid;
                conn.query(sql, function (err, res) {
                    swapData = res;
                    queueCb(err);
                    console.log(sql, err);
                });
            }, function (queueCb) {
                if (isUserTable) {
                    queueCb();
                } else {
                    var sql = "DELETE FROM " + tb + " WHERE userUid = " + userUid;
                    mysql.game(userUid).query(sql, function (err, res) {
                        console.log(err, res, sql);
                        queueCb(err);
                        //mysql.game(null, country, city).end(queueCb); // if no db connect request later
                    });
                }
            }, function (queueCb) {
                async.eachSeries(swapData, function (row, rowCb) {
                    if (isUserTable) {
                        var sql = "UPDATE " + tb + " SET ? WHERE userUid = " + mysql.escape(userUid);
                        row = {"ingot": row["ingot"]};
                    } else {
                        var sql = "INSERT INTO " + tb + " SET ?";
                    }
                    mysql.game(userUid).query(sql, row, function (err, res) {
                        console.log(err, res, sql, row);
                        rowCb();
                        //mysql.game(null, country, city).end(queueCb); // if no db connect request later
                    });
                }, queueCb);
            }, function (queueCb) {
                redis.user(userUid).h(keys[tb]).del();
                redis.user(userUid).s(keys[tb]).del();
                queueCb();
            }], next);
        }, cb);
    }, function (err) {
        console.log('end', err);
        process.exit();
    });
});