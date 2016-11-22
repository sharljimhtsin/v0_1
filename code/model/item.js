/**
 * 道具的数据处理
 * User: liyuluan
 * Date: 13-10-18
 * Time: 下午4:54
 */

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");

//sex:真元（色情杂志）
var iItemList = ["sex"];

/**
 * 添加道具数量
 * @param userUid
 * @param itemId
 * @param number 要增加(或减去）的道具数
 * @param callbackFn
 */
function updateItem(userUid, itemId, number, callbackFn) {
    var sqlWhere = "userUid=" + mysql.escape(userUid) + " AND itemId=" + mysql.escape(itemId);
    getItem(userUid, itemId, function (err, res) {
        if (err) callbackFn(err, null);
        else {
            if (res == null) { //如果表中没找到这个数据则插入一条
                if (number - 0 > 0) {
                    var insertSql = "INSERT INTO item SET ?";
                    var insertData = null;
                    if (iItemList.indexOf(itemId) == -1) {
                        insertData = {"number": number, "userUid": userUid, "itemId": itemId};
                    } else {
                        insertData = {"number": number, "userUid": userUid, "itemId": itemId, "type": 1};
                    }
                    mysql.game(userUid).query(insertSql, insertData, function (err, res) {
                        if (err) callbackFn(err, null);
                        else {
                            redis.user(userUid).s("item:" + itemId).del();
                            redis.user(userUid).s("item").del();
                            callbackFn(null, insertData);
                        }
                    });
                } else if (number < 0) {
                    callbackFn("dbError", null);
                } else {
                    callbackFn(null, {"number": 0, "userUid": userUid, "itemId": itemId});
                }
            } else {
                var userItemNumber = res["number"] - 0;
                var updateSql = "UPDATE item SET ? WHERE " + sqlWhere;
                var updateNumber = number - 0 + userItemNumber;//新的道具数量
                var updateData = {"number": updateNumber};
                var queryCallbackFn = function (err, res) {
                    if (err) callbackFn(err, null);
                    else {
                        redis.user(userUid).s("item:" + itemId).del();
                        redis.user(userUid).s("item").del();
                        callbackFn(null, {"number": updateNumber, "userUid": userUid, "itemId": itemId});
                    }
                };
                if (updateNumber == 0) {
                    updateSql = "DELETE FROM item WHERE " + sqlWhere;
                    mysql.game(userUid).query(updateSql, queryCallbackFn);
                } else {
                    mysql.game(userUid).query(updateSql, updateData, queryCallbackFn);
                }
            }
        }
    });
}


/**
 * @param userUid
 * @param itemId
 * @param callbackFn
 */
function getItem(userUid, itemId, callbackFn) {
    redis.user(userUid).s("item:" + itemId).getObj(function (err, res) {
        if (res == null) {
            var sql = "SELECT * FROM item WHERE userUid = " + mysql.escape(userUid) + " AND itemId = " + mysql.escape(itemId);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err || res == null) callbackFn(err, null);
                else {
                    if (res.length > 0) {
                        callbackFn(null, res[0]);
                        redis.user(userUid).s("item:" + itemId).setObj(res[0]);
                        redis.user(userUid).s("item:" + itemId).expire(604800);
                    } else {
                        callbackFn(null, null);
                    }
                }
            });
        } else {
            callbackFn(null, res);
        }
    });
}


/**
 * 返回道具列表（只返type为0的道具，即不返回内部使用道具)
 * @param userUid
 * @param callbackFn
 */
function getItems(userUid, callbackFn) {
    redis.user(userUid).s("item").getObj(function (err, res) {
        if (res == null) {
            var sql = "SELECT * FROM item WHERE type=0 AND userUid=" + mysql.escape(userUid);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err || res == null) callbackFn(err, null);
                else {
                    var resultData = {};
                    for (var i = 0; i < res.length; i++) {
                        var mItem = res[i];
                        resultData[mItem["itemId"]] = mItem;
                    }
                    redis.user(userUid).s("item").setObj(resultData, function (err, res) {
                        redis.user(userUid).s("item").expire(604800);
                        callbackFn(null, resultData);
                    });
                }
            });
        } else {
            callbackFn(null, res);
        }
    });
}

function sellItem(userUid, itemId, callbackFn) {
    updateItem(userUid, itemId, -1, function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            callbackFn();
        }
    });
}


exports.updateItem = updateItem;
exports.getItem = getItem;
exports.getItems = getItems;
exports.sellItem = sellItem;

