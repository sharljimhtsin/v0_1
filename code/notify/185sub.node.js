/**
 * Created by xiazhengxin on 2017/4/11.
 *
 * 返利补发接口
 用于玩家返利，手动补单等。

 http://游戏接口地址?vip=2&account=userID&playerName=玩家名字&playerId=123&value=1000&serverid=1&orderno=201701010504&channel=185&sign=md5值

 请求地址：通过185sdk后台游戏区服信息-补单地址设置
 请求方式：GET
 请求参数：
 account:登录帐号，对应登录参数userID
 serverid:游戏服务器ID
 channel:渠道ID，固定185
 orderno:虚拟唯一订单号（游戏方可通过此订单号检测重复订单）
 vip:是否增加vip经验 1.不增加  2.增加
 playerName:角色名称(1个号里有多角色的游戏才用到)
 playerId:角色id (1个号里有多角色的游戏才用到)
 value:钻石数量
 Sign:md5(account+"#"+value+"#"+serverid+"#"+ addSecret)，addSecret创建游戏时生成

 返回值：
 {“errcode”:0,”msg”:”成功”}
 {“errcode”:1,”msg”:”失败”}
 */

var platformConfig = require("../../config/platform");
var configManager = require("../config/configManager");
var order = require("../model/order");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var fs = require('fs');
var crypto = require('crypto');
var async = require("async");

function start(postData, response, query) {
    var NAME = "185ios";
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(query, "account", "serverid", "channel", "orderno", "vip", "playerName", "playerId", "value", "sign") == false) {
        response.end(JSON.stringify({"errcode": "1", "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var account = query["account"];
    var serverid = query["serverid"];
    var channel = query["channel"];
    var orderno = query["orderno"];
    var vip = query["vip"];
    var playerName = query["playerName"];
    var playerId = query["playerId"];
    var value = query["value"];
    var sign = query["sign"];
    var key = platformConfig[NAME]["SecretKey"];
    var appId = platformConfig[NAME]["AppID"];
    var country = platformConfig[NAME]["country"];
    var signStr = account + "#" + value + "#" + serverid + "#" + key;
    var md5Sign = crypto.createHash('md5').update(signStr, "utf8").digest('hex');
    var userUid;
    var theId = 0;
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (md5Sign == sign) {
        console.log("sign matched");
        async.series([function (cb) {
            user.pUserIdToUserUid(country, serverid, account, function (err, res) {
                if (err == null && res != null && typeof res == "object" && res.length != 0) {
                    userUid = res[0]["userUid"];
                } else {
                    err = "NULL";
                }
                cb(err);
            });
        }, function (cb) {
            var configData = configManager.createConfig(userUid);
            var payConfig = configData.getConfig("pay");
            var androidPay = payConfig["android"];
            for (var pay in androidPay) {
                var payItem = androidPay[pay];
                if (value == payItem["getImegga"]) {
                    theId = pay;
                    break;
                }
            }
            if (theId == 0) {
                cb("idErr");
            } else {
                cb();
            }
        }, function (cb) {
            var orderNo = jutil.guid();
            order.addOrder(orderNo, userUid, theId, function (err, res) {
                if (err) {
                    cb("dbError");
                } else {
                    var configData = configManager.createConfig(userUid);
                    var payConfig = configData.getConfig("pay");
                    var goodsConfig = payConfig["android"][theId];
                    var payMoney = goodsConfig["payMoney"];
                    var getImegga = goodsConfig["getImegga"] + goodsConfig["getMoreImegga"];
                    order.updateOrder(userUid, orderNo, NAME, appId, getImegga, payMoney, 1, "", theId, JSON.stringify(query), function (err, res) {
                        if (res == 1) {
                            console.log("order update ok");
                            cb();
                        } else {
                            console.log("order update failed");
                            cb("ERROR");
                        }
                    }, null, null, orderno);
                }
            });
        }], function (err, res) {
            if (err) {
                console.log(err);
                response.end(JSON.stringify({"errcode": "4", "msg": "未找到订单"}), "utf-8");
            } else {
                response.end(JSON.stringify({"errcode": "0", "msg": "补单成功"}), "utf-8");
            }
        });
    } else {
        console.log("sign not match");
        response.end(JSON.stringify({"errcode": "2", "msg": "数字签名错误"}), "utf-8");
    }
}

exports.start = start;
