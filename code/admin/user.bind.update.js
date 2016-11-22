/**
 * Created by xiazhengxin on 2016/8/4.5:26
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
        response.echo("user.bind.update", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "id", "userUid", "serverId", "pUserId", "platformId", "userName", "password", "mailIP", "userPassWord", "isZhuAn") == false) {
        response.echo("user.bind.update", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("bind", query, postData);
    var country = query["country"];
    var id = postData["id"];
    var userUid = postData["userUid"];
    var serverId = postData["serverId"];
    var pUserId = postData["pUserId"];
    var platformId = postData["platformId"];
    var userName = postData["userName"];
    var password = postData["password"];
    var mailIP = postData["mailIP"];
    var userPassWord = postData["userPassWord"];
    var isZhuAn = postData["isZhuAn"];
    var returnData;
    async.series([function (cb) {
        var sql = "show databases;";
        var newData = {};
        newData["userUid"] = userUid;
        newData["pUserId"] = pUserId;
        if (isZhuAn.toString() == "1") {
            //UPDATE `mailBind` SET `id`=[value-1],`userUid`=[value-2],`mailIP`=[value-3],`userPassWord`=[value-4],`pUserId`=[value-5] WHERE 1
            sql = "UPDATE `mailBind` SET ? WHERE `id` = " + id;
            newData["mailIP"] = mailIP;
            newData["userPassWord"] = userPassWord;
        } else {
            //UPDATE `mappingUser` SET `id`=[value-1],`userUid`=[value-2],`serverId`=[value-3],`pUserId`=[value-4],`platformId`=[value-5],`userName`=[value-6],`password`=[value-7] WHERE 1
            sql = "UPDATE `mappingUser` SET ? WHERE `id` = " + id;
            newData["serverId"] = serverId;
            newData["platformId"] = platformId;
            newData["userName"] = userName;
            newData["password"] = crypto.createHash('md5').update(password).digest('hex');
        }
        mysql.loginDB(country).query(sql, newData, function (err, res) {
            returnData = res;
            cb(err);
        });
    }, function (cb) {
        cb();
    }, function (cb) {
        cb();
    }], function (err, res) {
        response.echo("user.bind.update", err ? jutil.errorInfo(err) : returnData);
    });
}
exports.start = admin.adminAPIProxy(start);