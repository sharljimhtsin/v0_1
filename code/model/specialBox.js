/**
 * 开活动宝箱相关数据
 * User: joseppe
 * Date: 14-07-01
 * Time: 下午4:29
 */

var mysql = require("../alien/db/mysql");

/**
 * 取用户的开宝箱记录
 * @param userUid
 * @param callbackFn
 */
function getUserBox(userUid, itemId, callbackFn) {
    var sql = "SELECT * FROM specialBox WHERE userUid=" + mysql.escape(userUid) + " AND itemId=" + mysql.escape(itemId);
    mysql.game(userUid).query(sql, function(err, res) {
        if (err || res == null || res.length == 0) callbackFn(err, null);
        else {
            res[0]['probed'] = JSON.parse(res[0]['probed']);
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
function updateUserBox(userUid, itemId, boxData, callbackFn) {
    var sql = "UPDATE specialBox SET ? WHERE userUid=" + mysql.escape(userUid) + " AND itemId=" + mysql.escape(itemId);
    boxData['probed'] = JSON.stringify(boxData['probed']);
    mysql.game(userUid).query(sql, boxData, function(err,res) {
        if (err) callbackFn(err);
        else {
            if (res != null && res["affectedRows"] == 0) {
                var sql = "INSERT INTO specialBox SET ?";
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