/**
 * Created by xiazhengxin on 2017/6/23.
 *
 * 清除玩家激战排名
 */

var redis = require("../code/alien/db/redis");
var mysql = require("../code/alien/db/mysql");
var async = require("async");
var userList = [38671498104, 38671483793, 38671486148, 38671518562, 40063992498, 38671533078, 38671542632, 38671501170, 39275479102];

async.forEachSeries(userList, function (userUid, cb) {
    async.series([function (queueCb) {
        var sql = "UPDATE `pvptop` SET `userUid` = '1000', `robot` = '1' WHERE `userUid`=" + userUid;
        mysql.game(userUid).query(sql, function (err, res) {
            console.log(err, res, sql);
            queueCb();
            //mysql.game(null, country, city).end(queueCb); // if no db connect request later
        });
    }, function (queueCb) {
        redis.user(userUid).s("pvpUser").del(queueCb);
    }, function (queueCb) {
        redis.user(userUid).l("bychallenger").del(queueCb);
    }, function (queueCb) {
        queueCb();
    }, function (queueCb) {
        queueCb();
    }], function (err, res) {
        cb();
    });
}, function (err) {
    console.log('end', err);
    process.exit();
});