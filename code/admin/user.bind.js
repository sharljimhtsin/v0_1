/**
 * Created by xiayanxin on 2016/7/1.
 *
 * 裸包用户绑定登录口令接口
 */

var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var bitUtil = require("../alien/db/bitUtil");
var mysql = require("../alien/db/mysql");
var crypto = require("crypto");
var async = require("async");
var user = require("../model/user");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.bind", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "userName", "password") == false) {
        response.echo("user.bind", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("bind", query, postData);
    var userUid = postData["userUid"];
    var userName = postData["userName"];
    var password = postData["password"] + "";// TypeError: Not a string or buffer
    var mCode = bitUtil.parseUserUid(userUid);
    var country = mCode[0];
    var city = mCode[1];
    password = crypto.createHash('md5').update(password).digest('hex');
    var pUserId;
    var platformId;
    var returnData;
    var mappingData;
    async.series([function (cb) {
        user.getUserPlatformId(userUid, function (err, res) {
            if (err || res == null) {
                cb(err ? err : "NULL");
            } else {
                //callbackFn(null, {"platformId":pCode[0],"pUserId":pCode[1]});
                pUserId = res["pUserId"];
                platformId = res["platformId"];
                cb();
            }
        });
    }, function (cb) {
        var sql = "SELECT *  FROM `mappingUser` WHERE `userUid` = " + userUid;
        mysql.loginDB(country).query(sql, function (err, res) {
            mappingData = res;
            cb(err);
        });
    }, function (cb) {
        var newData = {};
        newData["userUid"] = userUid;
        newData["serverId"] = city;
        newData["pUserId"] = pUserId;
        newData["platformId"] = platformId;
        newData["userName"] = userName;
        newData["password"] = password;
        var sql;
        if (mappingData && mappingData.length > 0) {
            sql = "UPDATE `mappingUser` SET ? WHERE `userUid` = " + userUid;
        } else {
            sql = 'INSERT INTO mappingUser SET ?';
        }
        mysql.loginDB(country).query(sql, newData, function (err, res) {
            returnData = res;
            cb(err);
        });
    }], function (err, res) {
        response.echo("user.bind", err ? jutil.errorInfo(err) : returnData);
    });
}
exports.start = admin.adminAPIProxy(start);