/**
 * Created by xiazhengxin on 2016/12/4.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var noble = require("../model/noble");
var TAG = "noble.get";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var list = {};
    async.series([function (cb) {
        getData(userUid, function (err, res) {
            list = res;
            cb(err);
        });
    }], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, {
                "list": list
            });
        }
    });
}

function getData(userUid, callback) {
    var configData;
    var list = {};
    var costConfig;
    var equipConfig;
    async.series([function (cb) {
        noble.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = res;
                costConfig = configData["level"];
                equipConfig = configData["equip"];
                cb();
            }
        });
    }, function (cb) {
        noble.getData(userUid, function (err, res) {
            list = res ? res : list;
            cb(err);
        });
    }, function (cb) {
        for (var i = 1; i <= 8; i++) {
            if (list && list.hasOwnProperty(i)) {
                var level = parseInt(list[i]["level"]);
                list[i]["cost"] = costConfig[level];
            } else {
                var tmp = equipConfig[i];
                tmp["name"] = "";//jutil.toBase64(tmp["name"]);
                tmp["id"] = i;
                tmp["level"] = -1;
                tmp["cost"] = [];
                list[i] = tmp;
            }
        }
        cb();
    }], function (err, res) {
        callback(err, list);
    });
}

exports.start = start;
exports.getData = getData;