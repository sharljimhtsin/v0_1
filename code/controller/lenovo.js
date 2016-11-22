/**
 * Created by xiazhengxin on 2015/2/12 11:26.
 *
 * lenovo 登录验证接口
 */

var http = require("http");
var urlParse = require("url").parse;
var platformConfig = require("../../config/platform");
var parseString = require('xml2js').parseString;

function check(platformUserId, info, callbackFn) {
    var lpsust = info["lpsust"];
    var key = platformConfig["lenovo"]["AppKey"];
    var url = "http://passport.lenovo.com/interserver/authen/1.2/getaccountid?lpsust=" + lpsust + "&realm=" + key;
    var urlData = urlParse(url);

    var options = {
        hostname: urlData.hostname,
        port: urlData.port || 80,
        path: urlData.path,
        method: "GET",
        headers: {"Host": "passport.lenovo.com", "Content-Length": 32}
    };

    var req = http.request(options, function (res) {
		var mStatusCode = res.statusCode;
		res.setEncoding('utf8');
		var mData = '';
		res.on('data', function (chunk) {
			mData = chunk;
		});
		res.on('end', function () {
			parseString(mData, {explicitArray: false, ignoreAttrs: true}, function (err, res) {
				var resultData = {};
				try {
					var mDataObj = JSON.parse(res);
				} catch (err) {
					var mDataObj = {};
				}
				if (mDataObj.hasOwnProperty("IdentityInfo")) {
					resultData["status"] = mDataObj["IdentityInfo"]["verified"];
					resultData["username"] = mDataObj["IdentityInfo"]["Username"];
					resultData["platformUserId"] = mDataObj["IdentityInfo"]["AccountID"];
				} else {
					resultData["error"] = mDataObj["Error"]["Code"];
				}
				console.log(mDataObj);
				console.log(resultData);
				var msg = {
					"USS-0100": "无效的用户名 ，需要检查用户名格式是否正确。",
					"USS-0101": "口令错误.",
					"USS-0101": "无此用户 ，请检查用户名是否正确"
				};
				if (mDataObj && mDataObj["status"] == "1")//验证成功
					callbackFn(null, resultData);
				else
					callbackFn(msg[mDataObj["error"]]);
			});
		});
	});
    req.on("error", function (err) {
        callbackFn(err);
    });

    req.end();
}

exports.check = check;
