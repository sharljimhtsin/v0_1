/**
 * Created by xiazhengxin on 2016/12/4.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var noble = require("../model/noble");
var userVariable = require("../model/userVariable");
var TAG = "noble.map.get";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "force") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var force = postData["force"];
    var configData;
    var mapConfig;
    var battleConfig;
    var mapList = {};
    var mapStatus = {};
    async.series([function (cb) {
        noble.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = res;
                mapConfig = configData["name"];
                battleConfig = configData["battle"];
                cb();
            }
        });
    }, function (cb) {
        userVariable.setVariable(userUid, "force", force, cb);
    }, function (cb) {
        noble.getMapStatus(userUid, function (err, res) {
            mapStatus = res ? res : mapStatus;
            cb(err);
        });
    }, function (cb) {
        for (var id in mapConfig) {
            function getTimes() {
                if (mapStatus.hasOwnProperty(id)) {
                    var mapTimes = mapStatus[id];
                    if (jutil.compTimeDay(jutil.now(), mapTimes["time"])) {
                        return mapTimes["times"];
                    } else {
                        return 0;
                    }
                } else {
                    return 0;
                }
            }

            var mapObj = {
                "id": id,
                "name": jutil.toBase64(mapConfig[id]),
                "force": battleConfig[id],
                "times": getTimes()
            };
            mapList[id] = mapObj;
        }
        cb();
    }], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, {
                "mapList": mapList
            });
        }
    });
}

exports.start = start;