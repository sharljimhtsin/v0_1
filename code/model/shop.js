/**
 * 商店的数据层
 * User: liyuluan
 * Date: 13-12-23
 * Time: 下午4:31
 */

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");


/**
 * 商店列表
 */
function getShopList(userUid, callbackFn) {
//    redis.getClient().del("shopList");
//    redis.game(0).getClient().get("shopList",
    redis.domain(userUid).s("shopList").get(function(err, res) {
        if (err) callbackFn(err);
        else {
            if (res == null) {
                var sql = "SELECT * FROM shop WHERE close=0 order by `eTime`";
                mysql.loginDBFromUserUid(userUid).query(sql, function(err, res) {
                    if (err) callbackFn(err, null);
                    else {
                        var list = res || [];
                        var listStr = "[]";
                        try {
                            listStr = JSON.stringify(list);
                        } catch(error) {
                            console.error(error.stack);
                        }
//                        redis.game(0).getClient().set
                        redis.domain(userUid).s("shopList").set( listStr, function(err, res) {
                            callbackFn(null, listStr);
                        });
                    }//if
                });//mysql
            } else {
                callbackFn(null, res);
            }
        } //if
    });
}



function getShopItem(userUid, shopUid, callbackFn) {
    var sql = "SELECT * FROM shop WHERE shopUid=" + shopUid;
    mysql.loginDBFromUserUid(userUid).query(sql, function(err, res) {
        if (err || res == null || res.length == 0) callbackFn(err, null);
        else {
            callbackFn(null, res[0]);
        }
    });
}




//设置购买记录
function setBuylog(userUid, shopUid, count, callbackFn) {
    var sql = "SELECT count FROM buyLog WHERE userUid=" + mysql.escape(userUid) + " AND shopUid=" + mysql.escape(shopUid);
    mysql.game(userUid).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else {
            if (res == null || res.length == 0) {
                var insertSql = "INSERT INTO buyLog SET ?";
                var insertData = {"userUid":userUid, "shopUid":shopUid, "count":count};
                mysql.game(userUid).query(insertSql, insertData, function(err, res) {
                    if (err) callbackFn(err);
                    else {
                        callbackFn(0, 1);
                    }
                });
            } else {
                var resData = res[0];
                var newCount = (resData["count"] || 0) - 0 + count;
                var updateSql = "UPDATE buyLog SET ? WHERE userUid=" + mysql.escape(userUid) + " AND shopUid=" + mysql.escape(shopUid);
                var updateData = {"userUid":userUid, "shopUid":shopUid, "count":newCount};
                mysql.game(userUid).query(updateSql,updateData, function(err, res) {
                    if (err) callbackFn(err);
                    else {
                        callbackFn(0, 1);
                    }
                });
            }
        }
    });
}


//取购买记录
function getBuylog(userUid, callbackFn) {
    var sql = "SELECT shopUid,count FROM buyLog WHERE userUid=" + mysql.escape(userUid) ;
    mysql.game(userUid).query(sql, function(err, res) {
        callbackFn(err, res);
    });
}


//取购买记录项
function getBuylogItem(userUid, shopUid, callbackFn) {
    var sql = "SELECT shopUid,count FROM buyLog WHERE userUid=" + mysql.escape(userUid) + " AND shopUid=" + mysql.escape(shopUid);
    mysql.game(userUid).query(sql, function(err, res) {
        var mItem;
        if (res == null || res.length == 0) mItem == null;
        else mItem = res[0];
        callbackFn(err, mItem);
    });
}


exports.getShopList = getShopList;
exports.setBuylog = setBuylog;
exports.getBuylog = getBuylog;
exports.getShopItem = getShopItem;
exports.getBuylogItem = getBuylogItem;