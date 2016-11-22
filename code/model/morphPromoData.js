/**
 * Created by xiazhengxin on 2015/5/22 16:52.
 *
 * 异度转化 推广活动
 */

var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var activityConfig = require("../model/activityConfig");
var TAG = "morphPromo";

function getConfig(userUid, cb) {
    activityConfig.getConfig(userUid, TAG, function (err, res) {
        if (err) {
            cb(err);
        } else {
            if (res && res[0]) {
                cb(null, res[2]);
            } else {
                cb(null, null);
            }
        }
    });
}

function isActivityOpen(userUid, cb) {
    getConfig(userUid, function (err, res) {
        if (err) {
            cb(err);
        } else {
            if (res) {
                cb(null, true, res);
            } else {
                cb(null, false, null);
            }
        }
    });
}

exports.getConfig = getConfig;
exports.isActivityOpen = isActivityOpen;