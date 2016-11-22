/**
 * Created with JetBrains WebStorm.
 * User: hewei
 * Date: 14-7-25
 * Time: 上午11:40
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var user = require("../model/user");
var mysql = require("../alien/db/mysql")
var login = require("../model/login");
var kingnetPlatform = require("../../config/platform")["kingnetios"];
var configManager = require("../config/configManager");

function start(postData, response, query) {
    var uid = query["kingnetid"];
    var serverId = query["sid"];

    if (uid == null || serverId == null) {
        response.end(JSON.stringify({"ret":100,"info":"参数错误"}));
        return;
    }

    var country;
    if (kingnetPlatform == null || kingnetPlatform["country"] == null) {
        response.end(JSON.stringify({"ret":101,"info":"没有服务器"}));
        return;
    } else {
        country = kingnetPlatform["country"];
    }


    login.getServerList(country, 0, function(err, res) {
        if (err || res == null) {
            response.end(JSON.stringify({"ret":101,"info":"没有服务器"}));
            return;
        }
        var has = false;
        for (var i = 0; i < res.length; i++) {
            if (res[i]["id"] == serverId) {
                has = true;
            }
        }
        if (has == false) {
            response.end(JSON.stringify({"ret":101,"info":"没有服务器"}));
            return;
        }

        mysql.loginDB(country).query('SELECT * FROM user WHERE pUserId=' + mysql.escape(uid) + " OR udid=" + mysql.escape(uid), function(err, res) {
            if (err || res == null || res.length == 0) {
                response.end(JSON.stringify({"ret":102,"info":"ERROR"}));
                return;
            }
            var _udid = res[0]["udid"];
            var _pUserId = res[0]["pUserId"];
            if (_udid == "") _udid = _pUserId;

            var _sql = "SELECT userUid, exp, ingot, userName FROM user WHERE pUserId = " + mysql.escape(_pUserId) + " OR pUserId = " + mysql.escape(_udid);

            mysql.game(null, country, serverId).query(_sql, function(err, res) {
                if (err) {
                    response.end(JSON.stringify({"ret":102, "info":"ERROR"}));
                } else if (res != null && res.length > 0) {
                    var userObj = res[0];
                    var configData  = configManager.createConfig(userObj["userUid"]);
                    var msg = {};
                    msg["rolename"] = userObj["userName"];
                    msg["level"] = userObj["lv"];
                    msg["roleid"] = userObj["userUid"];
                    msg["gold"] = userObj["ingot"];
                    response.end(JSON.stringify({"ret":0, "msg":msg}));
                } else {
                    response.end(JSON.stringify({"ret":1}));
                }
            });
        });
    });
}

exports.start = start;