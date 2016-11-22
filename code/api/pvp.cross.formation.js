/**
 * Created by xiayanxin on 2016/9/19.
 *
 * 跨服激戰 取用户阵容
 */

var pvptop = require("../model/pvpTopCross");
var jutil = require("../utils/jutil");
var async = require("async");
var TAG = "pvp.cross.formation";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = postData["userUid"];
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
        pvptop.getPvpTopFormation(userUid, function (err, res) {
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