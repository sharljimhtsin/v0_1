/**
 * Created by xiazhengxin on 2017/6/1.
 *
 * 2、道具发放接口（直接发背包或者发邮件）----如果需要传角色ID需要提供一个角色查询接口
 http://xxxxxxxxxxxxxxxxxxx/item.php?user=1024995&server_id=1&item_id=653&item_num=2&sign=0

 传五个参数  user  用户id     server_id  区服id     item_id  道具id   item_num 道具数量     sign签名
 sign = md5(item_id+item_num+server_id+user+key);
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
    fs.appendFile('payOrder.log', NAME + "Item:" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(query, "user", "server_id", "item_id", "item_num", "sign") == false) {
        response.end(JSON.stringify({"errcode": "1", "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var userId = query["user"];
    var server_id = query["server_id"];
    var item_id = query["item_id"];
    var item_num = query["item_num"];
    var sign = query["sign"];
    var key = platformConfig[NAME]["SecretKey"];
    var appId = platformConfig[NAME]["AppID"];
    var country = platformConfig[NAME]["country"];
    var signStr = item_id + "" + item_num + "" + server_id + "" + userId + "" + key;
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