/******************************************************************************
 * 活跃度
 * 数据获取接口
 * Create by MR.Luo.
 * Create at 14-7-31.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var vitality = require("../model/vitality");
var configManager = require("../config/configManager");
var user = require("../model/user");

exports.start = function(postData, response, query) {
    var userUid = query["userUid"];
    var gRes = {};
    async.series([
        function(cb) { // 获取活动数据
            vitality.getData(userUid, function(err, res){
                if (err) cb(err);
                else {
                    var score = res["score"];
                    gRes["score"] = score;

                    var configAttr = res["data"]["configAttr"] || {};
                    gRes["configAttr"] = configAttr;

                    var rewardListAttr = res["data"]["rewardListAttr"] || {};
                    gRes["rewardListAttr"] = rewardListAttr;

                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) {
            response.echo("vitality.get",  jutil.errorInfo(err));
        } else {
            response.echo("vitality.get",  gRes);
        }
    });
};