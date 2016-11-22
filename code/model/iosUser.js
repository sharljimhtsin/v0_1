/**
 * Created by Raul on 2/12/14.
 */

var redis = require("../alien/db/redis");
var mysql = require("../alien/db/mysql");
var jutil = require("../utils/jutil");


/**
 * @param mDB
 * @param username
 * @param callbackFn
 */

function checkUserExists(mDB, username, callbackFn) {
    var sql = "SELECT uid FROM user WHERE username=" + mysql.escape(username) + " LIMIT 1";

    mDB.query(sql, function(err, res) {
        if (err) callbackFn(err);
        else {
            if (res == null || res.length == 0) {
                callbackFn(null, 0);
            } else {
                var uid = res[0]["uid"];
                callbackFn(null, uid);
            }
        }
    });
}

function changePassword(mDB, username,password, callbackFn) {
    var sql = "UPDATE user SET ? WHERE username = " + mysql.escape(username);
    mDB.query(sql, {"password":password}, function(err, res) {
        if (err) callbackFn(err);
        else {
            callbackFn(null, 1);
        }
    });
}

/**
 * @param mDB
 * @param username
 * @param password
 * @param callbackFn
 */

function createUser(mDB, username, password, callbackFn) {
    var sql = "INSERT INTO user (username, password, regTime) VALUES ('" + username + "', '" + password + "', " + jutil.now() + ")";
    mDB.query(sql, function(err, res) {
        if(err) callbackFn(err);
        else callbackFn(null, res);
    })
}

/**
 * @param mDB
 * @param username
 * @param password
 * @param callbackFn
 */

function getUser(mDB, username, password, callbackFn) {
    var sql = "SELECT uid FROM user WHERE username = " + mysql.escape(username) + " AND password = '" + password + "'";
    mDB.query(sql, function(err, res) {
        if (err) callbackFn(err);
        else {
            if (res == null || res.length == 0) {
                callbackFn("accountInvalid", 0);
            } else {
                var uid = res[0]["uid"];
                callbackFn(null, uid);
            }
        }
    })
}

exports.checkUserExists = checkUserExists;
exports.createUser = createUser;
exports.getUser = getUser;
exports.changePassword = changePassword;