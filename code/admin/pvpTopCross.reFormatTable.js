/**
 * Created by xiayanxin on 2016/9/26.
 */

var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var pvpTopCross = require("../model/pvpTopCross");
var bitUtil = require("../alien/db/bitUtil");
var async = require("async");
var fs = require("fs");
var TAG = "pvpTopCross.reFormatTable";

function start(postData, response, query, authorize) {
    var uid = query["uid"];
    var country = query["country"];
    var city = postData["city"];
    var fakeUserUid = bitUtil.createUserUid(country, city, 1);
    var isAll;
    async.series([function (cb) {
        pvpTopCross.getConfig(fakeUserUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                isAll = parseInt(res[2]["isAll"]) || 0;
                cb();
            }
        });
    }, function (cb) {
        pvpTopCross.resetMysqlTable(country, city, isAll, cb);
    }, function (cb) {
        cb();
    }], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, {"result": 1});
        }
    });
}
exports.start = start;