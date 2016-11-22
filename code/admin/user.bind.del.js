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
        response.echo("user.bind.del", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "id", "isZhuAn") == false) {
        response.echo("user.bind.del", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("bind", query, postData);
    var country = query["country"];
    var id = postData["id"];
    var isZhuAn = postData["isZhuAn"];
    var returnData;
    async.series([function (cb) {
        var sql = "show databases;";
        if (isZhuAn.toString() == "1") {
            sql = "DELETE FROM `mailBind` WHERE `id` = " + id;
        } else {
            sql = "DELETE FROM `mappingUser` WHERE `id` = " + id;
        }
        mysql.loginDB(country).query(sql, function (err, res) {
            returnData = res;
            cb(err);
        });
    }, function (cb) {
        cb();
    }, function (cb) {
        cb();
    }], function (err, res) {
        response.echo("user.bind.del", err ? jutil.errorInfo(err) : returnData);
    });
}
exports.start = admin.adminAPIProxy(start);