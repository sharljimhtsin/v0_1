/**
 * chat.send 发送聊天
 * User: joseppe
 * Date: 14-4-14
 * Time: 上午10:38
 */

var admin = require("../model/admin");
var chat = require("../model/chat");
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");


function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["login"], query["country"]) == false) {
        response.echo("chat.send", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "city") == false) {
        response.echo("chat.send", jutil.errorInfo("postError"));
        return;
    }

    var country = query["country"];
    var city = postData["city"];

    var configData = configManager.createConfigFromCountry(country);
    var cityList = null;
    if (city == 0) {
        cityList = admin.getCountryCityList(country);
    } else {
        cityList = [city];
    }

    var msg = jutil.filterWord2(postData["msg"]);
    msg = jutil.toBase64(msg);
    var userName = "GM";
    userName = jutil.toBase64(userName);

    var resList = {};
    async.forEach(cityList, function(cityValue, callbackFn) {
        chat.GMSendMsg(country, cityValue, userName, msg, function(err, res) {
            if (err) resList[cityValue] = 0;
            else resList[cityValue] = 1;
            callbackFn(err,res);
        });
    }, function(err, res) {
        if (err) {
            response.echo("chat.send", jutil.errorInfo("dbError"));
        } else {
            response.echo("chat.send", resList);
        }
    });
}

exports.start = admin.adminAPIProxy(start);