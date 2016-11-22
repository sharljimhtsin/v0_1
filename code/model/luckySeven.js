/**
 * Created with JetBrains WebStorm.
 * User: hewei
 * Date: 14-7-8
 * Time: 下午6:10
 * To change this template use File | Settings | File Templates.
 */

var variable = require("../model/userVariable");
var redis = require("../alien/db/redis");
var mysql = require("../alien/db/mysql");
var jutil = require("../utils/jutil");
/**
 * 获取剩余免费次数
 * @param userUid
 * @param callback
 */
function getFreeTimes(userUid, callback) {
    variable.getVariableTime(userUid, "luckySevenFreeTimes", function(err, res) {
        if (err)
            callback("dbError");
        else {
            callback(null, res);
        }
    });
}

/**
 * 设置剩余免费次数
 * @param userUid
 * @param value
 * @param callback
 */
function setFreeTimes(userUid, value, callback) {
    variable.setVariableTime(userUid, "luckySevenFreeTimes", value, jutil.now(), function(err, res) {
        if (err)
            callback("dbError");
        else {
            callback(null, res);
        }
    });
}

/**
 * 获取服务器积分
 * @param userUid
 * @param callback
 */
function getServerPoint(userUid, callback) {
    var sql = "SELECT * FROM serverData WHERE name='serverPoint'";
    mysql.game(userUid).query(sql, function (err, res) {
        if (err) callback(err);
        else {
            if (res == null || res.length == 0) {
                //console.error("bossLevel not exist:" + userUid);
                callback(null, 0);
            } else {
                var point = res[0]["value"];
                callback(null, point);
            }
        }
    });
}

/**
 *
 * @param userUid
 * @param point
 * @param callback
 */
function setServerPoint(userUid, point, callback) {
    var sql = "UPDATE serverData SET value=" + mysql.escape(point) + " WHERE name='serverPoint'";
    mysql.game(userUid).query(sql, function (err, res) {
        if (err || (res != null && res["affectedRows"] === 0)) {
            var insertSql = "INSERT INTO serverData SET ?";
            mysql.game(userUid).query(insertSql, {"name": "serverPoint", "value": point}, function (err, res) {
                if (err) callback(err);
                else {
                    callback(null, 1);
                }
            });
        } else {
            callback(null, 1);
        }
    });
}

/**
 * 获取用户积分
 * @param userUid
 * @param callback
 */
function getUserPoint(userUid, callback) {
    variable.getVariable(userUid, "userPoint", function(err, res) {
        if (err)
            callback("dbError");
        else {
            if (res == null || res.length == 0)
                callback(null, 0);
            else
                callback(null, res);
        }
    });
}

/**
 *
 * @param userUid
 * @param value
 * @param callback
 */
function setUserPoint(userUid, value, callback) {
    variable.setVariable(userUid, "userPoint", value, function(err, res) {
        if (err)
            callback("dbError");
        else {
            callback(null, null);
        }
    });
}

exports.getFreeTimes = getFreeTimes;
exports.setServerPoint = setServerPoint;
exports.getServerPoint = getServerPoint;
exports.getUserPoint = getUserPoint;
exports.setFreeTimes = setFreeTimes;
exports.setUserPoint = setUserPoint;