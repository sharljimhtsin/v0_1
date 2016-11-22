/**
 * User: liyuluan
 * Date: 14-5-29
 * Time: 下午2:19
 */

var jutil = require("../utils/jutil");
var kingnetPlatform = require("../../config/platform")["kingnet"];
var login = require("../model/login");


function start(postData, response, query) {
    var country;
    if (kingnetPlatform == null || kingnetPlatform["country"] == null) {
        response.end(JSON.stringify({"ret":1}));
        return;
    } else {
        country = kingnetPlatform["country"];
    }

    login.getServerList("g", 0, function(err, res) {
        var mlist = [];
        for (var i = 0; i < res.length; i++) {
            var o = {};
            o["server_id"] = res[i]["id"] - 0 + 10000;
            o["server_name"] = "IOS S" + res[i]["id"] + " " + jutil.fromBase64(res[i]["name"]);
            o["server_status"] = "1";
            mlist.push(o);
        }


        login.getServerList("e", 0, function(err, res) {

            for (var i = 0; i < res.length; i++) {
                var o = {};
                o["server_id"] = res[i]["id"];
                o["server_name"] = "Android S" + res[i]["id"] + " " + jutil.fromBase64(res[i]["name"]);
                o["server_status"] = "1";
                mlist.push(o);
            }


            var returnObj = {};
            returnObj["ret"] = 0;
            returnObj["msg"] = {"slist":mlist};

            response.end(JSON.stringify(returnObj));
        });
    });
}

exports.start = start;