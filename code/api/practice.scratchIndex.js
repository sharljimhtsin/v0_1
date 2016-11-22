/**
 * Created by xiazhengxin on 2015/1/26 13:32.
 *
 * 锻造系统首页
 */

var async = require("async");
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var scratch = require("../model/practiceScratch");
var TAG = "practice.scratchIndex";
function start(postData, response, query) {
    var userUid = query["userUid"];
    var returnData;
    var sTime;
    async.series([function (cb) {
        scratch.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                sTime = res[0];
                returnData = jutil.deepCopy(res[2]["exchange"]);//["exchange"]
                cb(null);
            }
        });
    }, function (cb) {
        scratch.getUserData(userUid, sTime, false, false, function (err, res) {//{}
            if (err) {
                cb(err);
            } else if(res == null || res["arg"] == undefined || res["arg"]["exchange"] == undefined){
                for(var i in returnData){
                    returnData[i]["useTimes"] = 0;
                }
                cb(null);
            } else {
                for(var j in returnData){
                    returnData[j]["useTimes"] = res["arg"]["exchange"][j]?res["arg"]["exchange"][j]:0;
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