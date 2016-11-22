/**
 * Created by xiazhengxin on 2015/1/26 15:26.
 *
 * 道具出售接口
 */

var item = require("../model/item");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var activityConfig = require("../model/activityConfig");
var async = require("async");
var user = require("../model/user");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var itemId = query["itemId"];
    var configData;
    var itemPriceUnit;
    var itemPrice;
    var TAG = "itemSell";
    async.series([function (cb) {
        item.getItem(userUid, itemId, function (err, res) {
            if (err || res == null) {
                cb(err);
            }
            cb();
        });
    }, function (cb) {
        activityConfig.getConfig(userUid, TAG, function (err, res) {
            if (err) cb(err);
            configData = res;
            cb();
        });
    }, function (cb) {
        item.sellItem(userUid, itemId, function (err, res) {
            if (err) cb(err);
            itemPriceUnit = configData[itemId]["PriceUnit"];
            itemPrice = configData[itemId]["Price"];
            cb();
        });
    }, function (cb) {
        // 返回用户对应的金币
        user.addUserData(userUid, itemPriceUnit, itemPrice, function (err, res) {
            if (err || res == 0) {
                cb(err);
            }
            cb();
        });
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {
                "result": "OK"
            });
        }
    });
}

exports.start = start;