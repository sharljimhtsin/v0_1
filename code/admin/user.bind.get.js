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
        response.echo("user.bind.get", admin.AUTH_ERROR);
        return;
    }
    admin.addOneOperationLog("bind", query, postData);
    var country = query["country"];
    var userUid = postData["userUid"] ? postData["userUid"] : "";
    var email = postData["email"] ? postData["email"] : "";
    var returnData;
    var mappingData;
    var bindingData;
    async.series([function (cb) {
        var sql = "SELECT *  FROM `mailBind` WHERE `userUid` LIKE '%" + userUid + "%' OR `mailIP` LIKE '%" + email + "%'";
        mysql.loginDB(country).query(sql, function (err, res) {
            bindingData = res;
            cb(err);
        });
    }, function (cb) {
        var sql = "SELECT *  FROM `mappingUser` WHERE `userUid` LIKE '%" + userUid + "%' OR `userName` LIKE '%" + email + "%'";
        mysql.loginDB(country).query(sql, function (err, res) {
            mappingData = res;
            cb(err);
        });
    }, function (cb) {
        var newData = [];
        for (var i in bindingData) {
            var tmp = bindingData[i];
            tmp["isZhuAn"] = 1;
            newData.push(tmp);
        }
        for (var i in mappingData) {
            var tmp = mappingData[i];
            tmp["isZhuAn"] = 0;
            newData.push(tmp);
        }
        returnData = newData;
        cb();
    }], function (err, res) {
        response.echo("user.bind.get", err ? jutil.errorInfo(err) : returnData);
    });
}
exports.start = admin.adminAPIProxy(start);