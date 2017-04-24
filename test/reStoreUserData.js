/**
 * Created by xiazhengxin on 2017/3/30.
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
var userList = [38671499503, 38671509748, 38671518562, 38671534209, 38671542014, 38688301320, 38788946389, 38805702106, 38889588694, 38906375664, 38906377497, 38906382039, 38923148310, 39074141987, 39074149085, 39141271767, 39158035498, 39258699660, 39460021572, 39460024069, 39527124409, 39527126752, 39661347028, 39678119925, 39778790981, 39896219731, 39980111695, 40063999264, 40063999470, 40063999520, 40080770235];
var swapData;
var db_prefix = "dragongame_";
var db_postfix = "_2017040300";
var tables = ["user", "hero", "skill", "item", "equipment"];//金币英雄技能道具装备
var keys = {"user": "h_user", "hero": "heroHash", "skill": "skill", "item": "item", "equipment": "equipment"};//金币英雄技能道具装备
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