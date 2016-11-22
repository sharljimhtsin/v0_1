/**
 * Created by xiayanxin on 2016/11/8.
 *
 * 清除用户重力数据
 */

var redis = require("../code/alien/db/redis");
var mysql = require("../code/alien/db/mysql");
var async = require("async");
var userList = [39460014868, 39510356876, 38788949885, 38788939534, 38889611662, 39778784222, 38671526535, 39560679892, 38906367074, 39778789044, 39476794753, 39560678514, 39527139157, 38721841155, 38688296570, 39728456335, 39292256379, 39275482804, 39023822748, 38856033623, 39007030209, 39493576703, 38671538683, 39309029461, 38788925903, 38671486148, 39141273461, 39694896377, 39007041055, 38671522494, 39627788071, 39376133274, 39896220771, 38990253344, 38923160519, 38671504327, 39527133406, 39527138339, 38788946057, 39661347298, 39527124409, 39392911316, 38671534047, 39527137646, 38721839192, 39007032809, 39191578950, 38788944374, 39560679035, 38889603657, 38671485006, 38889597307, 38805713044, 39527126752, 39007033605, 38923150639, 39560679749, 38822486541, 39409687518, 39577462878, 38956713289, 38772151440, 38839266732, 38805719266, 39241909344, 38906377754, 38889597203, 38822485399, 38889587753, 38889590198, 38805702106, 38906375664, 39543899206, 38671499503, 38721827489, 39074141987, 38671500525];

async.forEachSeries(userList, function (userUid, cb) {
    async.series([function (queueCb) {
        var sql = "UPDATE `heroGravity` SET `bigVigour`=0,`vigour`=0,`hp`=0,`attack`=0,`defence`=0,`spirit`=0,`hpp`=0,`attackp`=0,`defencep`=0,`spiritp`=0,`crit`=0,`tough`=0,`dodge`=0,`hit`=0,`break`=0,`preventBreak`=0,`critDamage`=0 WHERE `userUid`=" + userUid;
        mysql.game(userUid).query(sql, function (err, res) {
            console.log(err, res, sql);
            queueCb();
            //mysql.game(null, country, city).end(queueCb); // if no db connect request later
        });
    }, function (queueCb) {
        redis.user(userUid).h("heroGravity").del(queueCb);
    }, function (queueCb) {
        queueCb();
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