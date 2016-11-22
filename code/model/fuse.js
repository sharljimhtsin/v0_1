/**
 * 融合 ( 掌门口诀 )
 * User: liyuluan
 * Date: 13-10-23
 * Time: 下午4:50
 */
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");

/**
 * 取得融合的数据  返回四项基本属性的 融合经验和等级
 * @param userUid
 * @param callbackFn
 */
function getFuse(userUid, callbackFn) {
    redis.user(userUid).s("fuse").getObj(function (err, res) {
        if (res == null) {
            var sql = "SELECT * FROM fuse WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err) {
                    callbackFn(err, null);
                } else {
                    if (res == null || res.length == 0) {
                        callbackFn(null, null);
                    } else {
                        var fuseObj = res[0];
                        redis.user(userUid).s("fuse").setObjex(86400, fuseObj);
                        callbackFn(null, fuseObj);
                    }
                }
            });
        } else {
            callbackFn(null, res);
        }
    });
}

/**
 * 更新融合的数据值， 成功返回1
 * @param userUid
 * @param fuseData
 * @param callbackFn
 */
function updateFuse(userUid, fuseData, callbackFn) {
    var whereSql = "userUid=" + mysql.escape(userUid);
    mysql.dataIsExist(userUid, "fuse", whereSql, function (err, res) {
        if (res == 0) {
            var mFuseData = jutil.copyObject(fuseData);
            mFuseData["userUid"] = userUid;
            var insertSql = "INSERT INTO fuse SET ?";
            mysql.game(userUid).query(insertSql, mFuseData, function (err, res) {
                if (err) {
                    callbackFn(err, null);
                } else {
                    callbackFn(null, 1);
                    redis.user(userUid).s("fuse").del();
                }
            });
        } else {
            var updateSql = "UPDATE fuse SET ? WHERE " + whereSql;
            mysql.game(userUid).query(updateSql, fuseData, function (err, res) {
                if (err) callbackFn(err, null);
                else {
                    callbackFn(null, 1);
                    redis.user(userUid).s("fuse").del();
                }
            });
        }
    });
}

exports.getFuse = getFuse;
exports.updateFuse = updateFuse;
