/**
 * 开宝箱相关数据
 * User: liyuluan
 * Date: 13-11-21
 * Time: 下午2:44
 */

var mysql = require("../alien/db/mysql");

/**
 * 取用户的开宝箱记录
 * @param userUid
 * @param callbackFn
 */
function getUserBox(userUid, callbackFn) {
    var sql = "SELECT * FROM box WHERE userUid=" + mysql.escape(userUid);
    mysql.game(userUid).query(sql, function(err, res) {
        if (err || res == null || res.length == 0) callbackFn(err, null);
        else {
            callbackFn(null, res[0]);
        }
    });
}

/**
 *
 * @param userUid
 * @param boxData
 * @param callbackFn
 */
function updateUserBox(userUid, boxData, callbackFn) {
    var sql = "UPDATE box SET ? WHERE userUid=" + mysql.escape(userUid);
    mysql.game(userUid).query(sql, boxData, function(err,res) {
        if (err) callbackFn(err);
        else {
            if (res != null && res["affectedRows"] == 0) {
                var sql = "INSERT INTO box SET ?";
                var mBoxData = {};
                for (var key in boxData) {
                    mBoxData[key] = boxData[key];
                }
                mBoxData["point"] = boxData["point"] || 0;
                mBoxData["userUid"] = userUid;
                mysql.game(userUid).query(sql, mBoxData, function(err, res) {
                    callbackFn(null,1);
                });
            } else {
                callbackFn(null,1);
            }
        }
    });
}



exports.getUserBox = getUserBox;
exports.updateUserBox = updateUserBox;