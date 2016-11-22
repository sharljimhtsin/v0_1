/**
 * hero魂魄数据处理
 * User: liyuluan
 * Date: 13-10-28
 * Time: 上午10:20
 */
var mysql = require("../alien/db/mysql");

//添加魂魄到数据库,成功返回此魂的数据记录
function addHeroSoul(userUid, heroId, count, callbackFn) {
    var whereSql = "userUid=" + mysql.escape(userUid) + " AND heroId=" + mysql.escape(heroId);
    mysql.dataIsExist(userUid, "heroSoul", whereSql, function (err, res) {
        if (res == 0) {
            var insertSql = "INSERT INTO heroSoul SET ?";
            var insertData = {"userUid": userUid, "heroId": heroId, "count": count};
            mysql.game(userUid).query(insertSql, insertData, function (err, res) {
                if (err) callbackFn(err, null);
                else {
                    callbackFn(null, insertData);
                }
            });
        } else {
            getHeroSoulItem(userUid, heroId, function (err, res) {
                if (err) callbackFn(err, null);
                else {
                    var newCount = res["count"] - 0 + count;//新的魂魄数量
                    var updateSql = "UPDATE heroSoul SET ? WHERE " + whereSql;
                    var updateData = {"count": newCount};
                    var queryCallbackFn = function (err, res) {
                        if (err) callbackFn(err, null);
                        else {
                            callbackFn(null, {"userUid": userUid, "heroId": heroId, "count": newCount});
                        }
                    };
                    if (newCount == 0) {
                        updateSql = "DELETE FROM heroSoul WHERE " + whereSql;
                        mysql.game(userUid).query(updateSql, queryCallbackFn);
                    } else {
                        mysql.game(userUid).query(updateSql, updateData, queryCallbackFn);
                    }
                }
            });
        }
    });
}

//取魂魄列表
function getHeroSoul(userUid, callbackFn) {
    var sql = "SELECT * FROM heroSoul WHERE userUid=" + mysql.escape(userUid);
    mysql.game(userUid).query(sql, function (err, res) {
        if (err) callbackFn(err, null);
        else if (res == null || res.length == 0) callbackFn(null, null);
        else {
            var result = {};
            for (var i = 0; i < res.length; i++) {
                var resItem = res[i];
                result[resItem.heroId] = resItem;
            }
            callbackFn(null, result);
        }
    });
}

function getHeroSoulItem(userUid, heroId, callbackFn) {
    getHeroSoul(userUid, function (err, res) {
        if (err) callbackFn(err);
        else if (res == null) callbackFn(null, null);
        else {
            var item = res[heroId];
            callbackFn(null, item);
        }
    });
}

function delHeroSoulItem(userUid, heroId, count, callbackFn) {
    var sql = "SELECT count FROM heroSoul WHERE userUid=" + mysql.escape(userUid) + " AND heroId =" + mysql.escape(heroId);
    mysql.game(userUid).query(sql, function (err, res) {
        if (err || res.length == 0 || res[0]["count"] < count) callbackFn(err);
        else {
            var newCount = res[0]["count"] - count;//新的魂魄数量
            var updateSql = "UPDATE heroSoul SET ? WHERE " + "userUid=" + mysql.escape(userUid) + " AND heroId =" + mysql.escape(heroId);
            var updateData = {"count": newCount};
            var cb = function (err, res) {
                if (err) {
                    callbackFn(err, newCount);
                } else {
                    callbackFn(null, newCount);
                }
            };
            if (newCount == 0) {
                updateSql = "DELETE FROM heroSoul WHERE " + "userUid=" + mysql.escape(userUid) + " AND heroId =" + mysql.escape(heroId);
                mysql.game(userUid).query(updateSql, cb);
            } else {
                mysql.game(userUid).query(updateSql, updateData, cb);
            }
        }
    });
}


exports.addHeroSoul = addHeroSoul;
exports.getHeroSoul = getHeroSoul;
exports.getHeroSoulItem = getHeroSoulItem;
exports.delHeroSoulItem = delHeroSoulItem;