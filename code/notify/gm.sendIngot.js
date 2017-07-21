/**
 * Created by xiazhengxin on 2017/6/1.
 *
 * 1、发放钻石接口：
 元宝接口----如果需要传角色ID需要提供一个角色查询接口
 http://xxxxxxxxxxxxxxxx/pay.php?user=1024995&server_id=1&money=20&sign=0
 传三个参数  user  用户id     server_id  区服id    money   元宝数量     sign签名
 sign = md5(money+server_id+user+key);
 *
 */

var platformConfig = require("../../config/platform");
var modelUtil = require("../model/modelUtil");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var fs = require('fs');
var crypto = require('crypto');
var async = require("async");

function start(postData, response, query) {
    var NAME = "gm";
    fs.appendFile('payOrder.log', NAME + "Ingot:" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(query, "user", "server_id", "money", "sign") == false) {
        response.end(JSON.stringify({"errcode": "1", "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var userId = query["user"];
    var server_id = query["server_id"];
    var money = query["money"];
    var item_id = "ingot";
    var item_num = 10000;
    var sign = query["sign"];
    var key = platformConfig[NAME]["SecretKey"];
    var appId = platformConfig[NAME]["AppID"];
    var country = platformConfig[NAME]["country"];
    var signStr = money + "" + server_id + "" + userId + "" + key;
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
            modelUtil.addDropItemToDB(item_id, item_num, userUid, 0, 1, cb);
        }, function (cb) {
            cb();
        }], function (err, res) {
            if (err) {
                console.log(err);
                response.end(JSON.stringify({"errcode": "4", "msg": "发放失败"}), "utf-8");
            } else {
                response.end(JSON.stringify({"errcode": "0", "msg": "发放成功"}), "utf-8");
            }
        });
    } else {
        console.log("sign not match");
        response.end(JSON.stringify({"errcode": "2", "msg": "数字签名错误"}), "utf-8");
    }
}

exports.start = start;