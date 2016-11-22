/**
 * Created by xiazhengxin on 2015/3/18 16:09.
 *
 * 乱斗会批量注册、报名脚本
 */

var http = require("http");
var querystring = require('querystring');
var urlParse = require("url").parse;
var async = require("async");
var jutil = require("../code/utils/jutil");
var key = Math.floor(Math.random() * 1000);
var host = "dbztest.gt.com";
var port = 8906;

function doRegisterAndJoin(count, mainCb) {
    var url;
    var data;
    var userUid;
    var token;
    async.series([function (cb) {
        // get token
        url = "http://" + host + ":" + port + "/api?token=&userUid=&language=cn&packet=&udid=&method=user.getToken";
        data = {
            "platformId": "uc",
            "platformUserId": "mixContest" + key + "No" + count,
            "info": "",
            "serverId": "1",
            "packetName": ""
        };
        doPOST(url, data, function (err, res) {
            if (err) {
                cb(err);
            } else {
                userUid = res["user.getToken"]["userUid"];
                token = res["user.getToken"]["token"];
                cb();
            }
        });
    }, function (cb) {
        // register user
        url = "http://" + host + ":" + port + "/api?token=" + token + "&userUid=" + userUid + "&language=cn&packet=&udid=&method=user.create";
        data = {
            "userName": "mixContest" + key + "No" + count,
            "selectedHeroId": "1"
        };
        var valid = jutil.filterWord(data["userName"]);
        if (valid.indexOf("*") != -1) {
            mainCb();
        } else {
            doPOST(url, data, function (err, res) {
                cb(err);
            });
        }
    }, function (cb) {
        // join
        url = "http://" + host + ":" + port + "/api?token=" + token + "&userUid=" + userUid + "&language=cn&packet=&udid=&method=pvp.mixContest.join";
        data = {};
        doPOST(url, data, function (err, res) {
            cb(err);
        });
    }, function (cb) {
        // refresh formation
        url = "http://" + host + ":" + port + "/api?token=" + token + "&userUid=" + userUid + "&language=cn&packet=&udid=&method=pvp.mixContest.refreshFormation";
        data = {"type": 0};
        doPOST(url, data, function (err, res) {
            cb(err);
        });
    }], function (err, res) {
        mainCb(err);
    });
}

function doPOST(url, data, callbackFn) {
    console.log('POST: ' + JSON.stringify(data));
    var urlData = urlParse(url);
    var postData = querystring.stringify({"data": JSON.stringify(data)});
    var options = {
        hostname: urlData.hostname || host,
        port: urlData.port || port,
        path: urlData.path,
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        }
    };
    var req = http.request(options, function (res) {
        console.log('STATUS: ' + res.statusCode);
        res.setEncoding('utf8');
        var mData = '';
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
            mData += chunk;
        });
        res.on('end', function () {
            var mDataObj;
            try {
                mDataObj = JSON.parse(mData);
            } catch (e) {
                console.error(e);
            } finally {
                callbackFn(null, mDataObj);
            }
        });
    });
    req.on("error", function (err) {
        callbackFn(err);
    });
    req.write(postData);
    req.end();
}

async.timesSeries(1000, function (n, next) {
    doRegisterAndJoin(n, next);
}, function (err, res) {
    console.log(err ? err : "no err");
});
