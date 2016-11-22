/**
 * Created by xiazhengxin on 2015/10/10 18:55.
 */

var fs = require("fs");
var platformConfig = require("../../config/platform");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var bitUtil = require("../alien/db/bitUtil");
var async = require("async");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "platformId", "serverId") == false) {
        echo(jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var platformId = postData["platformId"];
    var serverId = postData["serverId"];
    var country = platformConfig["mo9"]["country"];
    var userData;
    async.series([function (cb) {
        if (isNaN(userUid)) {
            cb("ID ERROR");
        } else {
            cb();
        }
    }, function (cb) {
        if (jutil.indexOf(country, bitUtil.parseUserUid(userUid)[0])) {
            cb();
        } else {
            cb("PLAT ERROR");
        }
    }, function (cb) {
        user.getUser(userUid, function (err, res) {
            userData = res;
            cb(err);
        });
    }, function (cb) {
        if (userData == null) {
            cb("NULL");
        } else {
            cb();
        }
    }, function (cb) {
        var targetCountry = platformConfig[platformId]["country"];
        var sourceCountry = platformConfig[userData["platformId"]]["country"];
        if (targetCountry != sourceCountry) {
            cb("DIFF");
        } else {
            cb();
        }
    }, function (cb) {
        if (bitUtil.parseUserUid(userUid)[1] != serverId) {
            cb("DIFF");
        } else {
            cb();
        }
    }], function (err, res) {
        if (err) {
            echo(jutil.errorInfo(err));
        } else {
            echo(userData);
        }
    });
    function echo(data) {
        var str = JSON.stringify(data);
        if (query != '' && query.callback != undefined) {
            response.end(query.callback + '(' + str + ')', "utf-8");
        } else {
            response.end(str, "utf-8");
        }
    }
}

exports.start = start;