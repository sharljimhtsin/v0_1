/**
 * Created by xiayanxin on 2016/11/10.
 *
 * * * 恢复用户重力数据
 */

var redis = require("../code/alien/db/redis");
var mysql = require("../code/alien/db/mysql");
var bitUtil = require("../code/alien/db/bitUtil");
var mail = require("../code/model/mail");
var async = require("async");
var mysqlLib = require('mysql');
/*
 *
 * ip:50.97.63.53
 port:3306
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
var userList = [39443248988, 39040588149, 39275482619, 39678124620, 39879447666, 39711677752, 39359367941, 39627793619, 39577456476, 38990267384, 38671535927, 38688313452, 39527123756, 38671495660, 39124484005, 39778781225, 39359368007, 39057359262, 38872843522, 39611009552, 39845892251, 38688269063, 39829117536, 39359358910, 39527136260, 39611010328, 39594233870, 39577462217, 38990252773, 39426463428, 39426457664, 38872843597, 38939930549, 39325811383, 39141271767, 38956707565, 38939920477, 39443248982, 38671518598, 38956710619, 38671518600, 39090913293, 38671509748, 39074143621, 38721843991, 39426467734, 39074136841, 39325794393, 39074143936];
var swapData;
var db_prefix = "dragongame_";
var db_postfix = "_2016110700";

async.forEachSeries(userList, function (userUid, cb) {
    //`bigVigour`=0,`vigour`=0,`hp`=0,`attack`=0,`defence`=0,`spirit`=0,`hpp`=0,`attackp`=0,`defencep`=0,`spiritp`=0,`crit`=0,`tough`=0,`dodge`=0,`hit`=0,`break`=0,`preventBreak`=0,`critDamage`=0
    async.series([function (queueCb) {
        var mCode = bitUtil.parseUserUid(userUid);
        var db = db_prefix + mCode[1] + db_postfix;
        var sql = "SELECT `heroUid`, `userUid`, `bigVigour`, `vigour`, `hp`, `attack`, `defence`, `spirit`, `hpp`, `attackp`, `defencep`, `spiritp`, `crit`, `tough`, `dodge`, `hit`, `break`, `preventBreak`, `critDamage` FROM `" + db + "`.`heroGravity` WHERE `userUid` = " + userUid;
        conn.query(sql, function (err, res) {
            swapData = res;
            queueCb(err);
            console.log(sql, err);
        });
    }, function (queueCb) {
        async.eachSeries(swapData, function (row, rowCb) {
            var uid = row["userUid"];
            delete row["userUid"];
            var hid = row["heroUid"];
            delete row["heroUid"];
            var sql = "UPDATE `heroGravity` SET ? WHERE `userUid` = " + uid + " and `heroUid` = " + hid;
            mysql.game(userUid).query(sql, row, function (err, res) {
                console.log(err, res, sql, row);
                rowCb();
                //mysql.game(null, country, city).end(queueCb); // if no db connect request later
            });
        }, queueCb);
    }, function (queueCb) {
        redis.user(userUid).h("heroGravity").del(queueCb);
    }, function (queueCb) {
        /*
         * Dear players,
         We have fixed the gravity training issue. If you use glitch again or use the mechanics of the game to get unfair advantage, we will ban the account.
         *
         * */
        mail.addMail(userUid, "-1", "Dear players,We have fixed the gravity training issue. If you use glitch again or use the mechanics of the game to get unfair advantage, we will ban the account.", JSON.stringify([{
            "id": "155002",
            "count": 10
        }]), "911", queueCb);
    }, function (queueCb) {
        queueCb();
    }], function (err, res) {
        cb();
    });
}, function (err) {
    console.log('end', err);
    process.exit();
});