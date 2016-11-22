/**
 * Created by xiazhengxin on 2016/3/15 7:21.
 */

var jutil = require("../utils/jutil");
var login = require("../model/login");
var platformConfig = require("../../config/platform");
var async = require("async");

function start(postData, response, query) {
    var platformId = "RayCreator";
    var mConfig = platformConfig[platformId];
    if (mConfig["serverId"] == undefined || mConfig["serverId"] == null) {
        mConfig["serverId"] = 1;
    }
    var mCountry = mConfig["country"];
    var returnData = {};
    returnData["errorCode"] = 0;
    returnData["errorMessage"] = "";
    async.series([
        function (cb) {
            login.getServerList(mCountry, 0, function (err, res) {
                var list = jutil.deepCopy(res);
                var returnList = [];
                for (var i in list) {
                    i = list[i];
                    var returnObj = {};
                    returnObj["id"] = i["id"];
                    returnObj["status"] = i["isOpen"];
                    returnObj["name"] = jutil.fromBase64(i["name"]);
                    returnList.push(returnObj);
                }
                returnData["list"] = returnList;
                cb(null);
            }, mConfig["preOpen"]);
        },
    ], function (err) {
        if (err) {
            returnData["errorCode"] = 1;
            returnData["errorMessage"] = err;
        }
        echo(returnData);
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