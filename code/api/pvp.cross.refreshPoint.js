/**
 * Created by xiayanxin on 2016/9/19.
 *
 * 跨服激戰 刷新竞技场积分
 */

var jutil = require("../utils/jutil");
var pvptop = require("../model/pvpTopCross");
var async = require("async");
var TAG = "pvp.cross.refreshPoint";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var data;
    var isAll;
    var key;
    async.series([function (cb) {
        pvptop.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                isAll = parseInt(res[2]["isAll"]) || 0;
                key = res[2]["key"] || "1";
                cb();
            }
        });
    }, function (cb) {
        pvptop.getCurrentPoint(userUid, isAll, function (err, res) {
            data = res;
            cb(err);
        });
    }], function (err, res) {
        if (err || data == null) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, data);
        }
    });
}

exports.start = start;
