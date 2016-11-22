/**
 * Created by xiayanxin on 2016/11/9.
 *
 * * 设置用户重力数据
 */

var redis = require("../code/alien/db/redis");
var mysql = require("../code/alien/db/mysql");
var configManager = require("../code/config/configManager");
var async = require("async");
var userList = [39527137646, 38721839192, 39007032809, 39191578950, 38788944374, 39560679035, 38889603657, 38671485006, 38889597307, 38805713044, 39527126752, 39007033605, 38923150639, 39560679749, 38822486541, 39409687518, 39577462878, 38956713289, 38772151440, 38839266732, 38805719266, 39241909344, 38906377754, 38889597203, 38822485399, 38889587753, 38889590198, 38805702106, 38906375664, 39543899206, 38671499503, 38721827489, 39074141987, 38671500525];
var line = 1;
var updateData;

async.forEachSeries(userList, function (userUid, cb) {
    var configData = configManager.createConfig(userUid);
    var gravityTrain = configData.getConfig("gravityTrain");
    //`bigVigour`=0,`vigour`=0,`hp`=0,`attack`=0,`defence`=0,`spirit`=0,`hpp`=0,`attackp`=0,`defencep`=0,`spiritp`=0,`crit`=0,`tough`=0,`dodge`=0,`hit`=0,`break`=0,`preventBreak`=0,`critDamage`=0
    updateData = {"bigVigour": line, "vigour": line};
    async.series([function (queueCb) {
        var useGenki = gravityTrain["useGenki"];
        for (var a in useGenki) {
            if (line >= parseInt(a)) {
                var content = useGenki[a]["content"];
                for (var b in content) {
                    b = content[b];
                    if (updateData.hasOwnProperty(b["addAttrType"])) {
                        updateData[b["addAttrType"]] += b["addAttr"];
                    } else {
                        updateData[b["addAttrType"]] = b["addAttr"];
                    }
                }
            }
        }
        queueCb();
    }, function (queueCb) {
        var sql = "UPDATE `heroGravity` SET ? WHERE `userUid`=" + userUid;
        mysql.game(userUid).query(sql, updateData, function (err, res) {
            console.log(err, res, sql, updateData);
            queueCb();
            //mysql.game(null, country, city).end(queueCb); // if no db connect request later
        });
    }, function (queueCb) {
        redis.user(userUid).h("heroGravity").del(queueCb);
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