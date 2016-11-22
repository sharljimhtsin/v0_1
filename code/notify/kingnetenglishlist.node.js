/**
 * Created with JetBrains WebStorm.
 * User: hewei
 * Date: 14-7-25
 * Time: 上午11:38
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var kingnetPlatform = require("../../config/platform")["kingnetenglish"];
var login = require("../model/login");


function start(postData, response, query) {
    var country;
    if (kingnetPlatform == null || kingnetPlatform["country"] == null) {
        response.end(JSON.stringify({"ret":1}));
        return;
    } else {
        country = kingnetPlatform["country"];
    }

    login.getServerList(country, 0, function(err, res) {
        var mlist = [];
        for (var i = 0; i < res.length; i++) {
            var o = {};
            o["server_id"] = res[i]["id"];
            o["server_name"] = "S" + res[i]["id"] + " " + jutil.fromBase64(res[i]["name"]);
            o["server_status"] = "1";
            mlist.push(o);
        }
        var returnObj = {};
        returnObj["ret"] = 0;
        returnObj["msg"] = {"slist":mlist};
        response.end(JSON.stringify(returnObj));
    });
}

exports.start = start;