/**
 * User: liyuluan
 * Date: 13-10-16
 * Time: 上午11:30
 */

var jutil = require("../utils/jutil");
var login = require("../model/login");
var user = require("../model/user");
var platformConfig = require("../../config/platform");
var stats = require("../model/stats");
var platform = require("../model/platform");
var async = require("async");
var fs = require('fs');


function start(postData, response, query) {
    if (jutil.postCheck(postData, "platformId", "platformUserId") == false ) {
        response.echo("server.list",jutil.errorInfo("postError"));
        return;
    }

    var platformId = postData["platformId"];
    var platformUserId = postData["platformUserId"];
    if (platformUserId == "") {
        platformUserId = "random:" + Math.floor(Math.random() * 0xFFFFFFFF).toString(16);
    }
    var udid = postData["udid"] || "TESTTEST";
    var token2 = postData["token2"] || "";

    var isAdmin = (platformUserId == 617311396 || platformUserId == 570744365) ? 1 : 0;

    var mConfig = platformConfig[platformId];
    if (mConfig == null || mConfig["country"] == null) {
        response.echo("server.list",jutil.errorInfo("configError"));
        return;
    }
    if (mConfig["serverId"] == undefined || mConfig["serverId"] == null) {
        mConfig["serverId"] = 1;
    }

    var mCountry = mConfig["country"];

    var returnData = {"startServer":mConfig["serverId"]};

    async.series([
        function(cb) {
            login.getServerList(mCountry, isAdmin, function (err, res) {
                var ip = query["clientIp"];
                var gtIp = ["101.95.167.238", "180.168.107.74", "103.242.168.71", "210.65.163.107", "180.168.107.76", "180.168.133.34", "43.225.36.109"];
                var list = jutil.deepCopy(res);
                if (gtIp.indexOf(ip) == -1) {//如果是公司网络
                    if (list[list.length - 1] && list[list.length - 1]["id"] == 255) {
                        list.splice(list.length - 1, 1);//移除末尾
                    }
                    returnData["serverList"] = list;
                } else {
                    returnData["serverList"] = list;
                }
                cb(null);
            }, mConfig["preOpen"]);
        },
        function(cb) {
            login.getLastServer(mCountry, platformId, platformUserId, function(err, res) {
                if (err) returnData["lastServer"] = [];
                else {
                    if (res.length > 0) {
                        returnData["lastServer"] = res;
                    } else {
                        returnData["lastServer"] = [];
                    }
                }
                cb(null);
            });
        },
        function (cb) {
            var arr = [];
            var list = returnData["serverList"];
            for (var i = 0; i < list.length; i++) {
                if (list[i]["merge"]) {
                    continue;
                }
                arr.push(list[i]);
            }
            returnData["serverList"] = arr;
            cb();
        },
        function (cb) {
            var list = returnData["serverList"];
            for (var i = 0; i < list.length; i++) {
                var name = list[i]["name"];
                if (typeof name == "object") {
                    returnData["serverList"][i]["name"] = jutil.toBase64(name.hasOwnProperty(platformId) ? name[platformId] : name["default"]);
                }
            }
            cb();
        },
        function(cb) {
            if (udid != null) {
                platform.addDevice(mCountry, udid, function (err, res) {
                    if (res == 1) {
                        stats.device(mCountry, udid, platformId, platformUserId);
                        fs.appendFile('udid.log', jutil.now() + " | " + udid + " | " + platformId + " | " + platformUserId + "\n", 'utf8');
                    }
                    fs.appendFile('udid.log', jutil.now() + " | " + udid + " | " + platformId + " | " + "\n", 'utf8');
                    cb(null);
                });
            } else {
                cb(null);
            }
        },
        function(cb) {
            if (token2 != "") {
                user.setToken(mCountry, platformId, platformUserId, token2, cb);
            } else {
                cb(null);
            }
        }
    ], function(err) {
        response.echo("server.list",returnData);
    });
}

exports.start = start;