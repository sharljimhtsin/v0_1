/**
 * Created by xiayanxin on 2016/11/9.
 *
 * * 设置用户重力数据
 */

var redis = require("../code/alien/db/redis");
var mysql = require("../code/alien/db/mysql");
var configManager = require("../code/config/configManager");
var async = require("async");
var userList = [39476800443];
var heroList = [1718006950408449, 1538815512555777, 1718006883299585, 1719821171437825, 1718007118180609, 1123796647948545, 1719821104328961, 1719821020442881];
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
        if (heroList.length > 0) {
            sql += " AND `heroUid` in (" + heroList.join(",") + ")";
        }
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