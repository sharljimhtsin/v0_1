/**
 * 邮箱绑定功能
 * User: za
 * Date: 16-2-1
 * Time: 下午16:44
 */
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");
var async = require("async");
var ACTIVITY_CONFIG_NAME = "mailBinding";
var mysql = require("../alien/db/mysql");

//取用户数据
function getUserData(userUid, callbackFn) {
    var sql = "SELECT * FROM mailBind WHERE userUid=" + mysql.escape(userUid);
    mysql.loginDBFromUserUid(userUid).query(sql, function (err, res) {
        if (err) callbackFn(err);
        else {
            if (res == null || res.length == 0) {
                callbackFn(err, null);
            } else {
                var data = res;
                callbackFn(err, data);
            }
        }
    });
}
function check(userUid, data, mail, callbackFn) {
    async.series([
        function (cb) {
            var sql = "SELECT * FROM mailBind WHERE mailIP=" + mysql.escape(mail);// +" and userUid=" + mysql.escape(userUid);
            mysql.loginDBFromUserUid(userUid).query(sql, function (err, res) {
                if (err) cb(err);
                else {
                    if (res == null || res.length == 0) {
                        var insertSql = "INSERT INTO mailBind SET ?";
                        var insertData = {
                            "mailIP": data["mailIP"],
                            "userPassWord": data["userPassWord"],
                            "userUid": data["userUid"],
                            "pUserId": data["pUserId"]
                        };
                        if (data["mailIP"] != null) insertData["mailIP"] = data["mailIP"];
                        if (data["userPassWord"] != null) insertData["userPassWord"] = data["userPassWord"];
                        mysql.loginDBFromUserUid(userUid).query(insertSql, insertData, function (err, res) {
                            if (err) cb(err);
                            else cb(null, 1);
                        });
                    } else {
                        cb("mailHasUsed");
                    }
                }
            });
        }
    ], function (err, res) {
        if (err && err != "mailHasUsed") {
            callbackFn(err, null);
        } else {
            redis.loginFromUserUid(userUid).s("action:" + ACTIVITY_CONFIG_NAME + userUid).set(JSON.stringify(data), function (err, res) {

            });
            callbackFn(err, 1);
        }
    });
}

exports.getUserData = getUserData;//获取用户数据
exports.check = check;//验证邮箱
