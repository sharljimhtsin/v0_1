/**
 * Created by xiazhengxin on 2017/8/14.
 */

var platformConfig = require("../../config/platform");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var redis = require("../alien/db/redis");
var fs = require('fs');
var crypto = require('crypto');
var async = require("async");

function start(postData, response, query) {
    var NAME = "gm";
    fs.appendFile('payOrder.log', NAME + "topLevel:" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(query, "user", "server_id", "sign", "lv") == false) {
        response.end(JSON.stringify({"errcode": "1", "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var lv = query["lv"];
    var userId = query["user"];
    var server_id = query["server_id"];
    var sign = query["sign"];
    var key = platformConfig[NAME]["SecretKey"];
    var appId = platformConfig[NAME]["AppID"];
    var country = platformConfig[NAME]["country"];
    var signStr = lv + "" + server_id + "" + userId + "" + key;
    var md5Sign = crypto.createHash('md5').update(signStr, "utf8").digest('hex');
    var userUid;
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (md5Sign == sign) {
        console.log("sign matched");
        async.series([function (cb) {
            user.pUserIdToUserUid(country, server_id, userId, function (err, res) {
                if (err == null && res != null && typeof res == "object" && res.length != 0) {
                    userUid = res[0]["userUid"];
                } else {
                    err = "NULL";
                }
                cb(err);
            });
        }, function (cb) {
            var data = {"lv": lv};
            user.updateUser(userUid, data, cb);
        }, function (cb) {
            cb();
        }], function (err, res) {
            if (err) {
                console.log(err);
                response.end(JSON.stringify({"errcode": "4", "msg": "升级失败"}), "utf-8");
            } else {
                response.end(JSON.stringify({"errcode": "0", "msg": "升级成功"}), "utf-8");
            }
        });
    } else {
        console.log("sign not match");
        response.end(JSON.stringify({"errcode": "2", "msg": "数字签名错误"}), "utf-8");
    }
}

exports.start = start;