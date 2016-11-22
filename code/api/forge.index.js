/**
 * Created by xiazhengxin on 2015/1/26 13:32.
 *
 * 锻造系统首页
 */

var async = require("async");
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var forge = require("../model/practiceForge");
var TAG = "forge.index";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var returnData;
    var sTime;
    async.series([function (cb) {
        forge.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                sTime = res[0];
                returnData = jutil.deepCopy(res[2]);
                cb(null);
            }
        });
    }, function (cb) {
        forge.getUserData(userUid, sTime, function (err, res) {
            if (err) {
                cb(err);
            } else {
                for(var i in returnData){
                    returnData[i]["useTimes"] = res["arg"][i]?res["arg"][i]:0;
                }
                cb(null);
            }
        });
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, returnData);
        }
    });
}
exports.start = start;