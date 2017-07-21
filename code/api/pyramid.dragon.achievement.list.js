/**
 * Created by xiazhengxin on 2017/6/12.
 */

var jutil = require("../utils/jutil");
var async = require("async");
var pyramid = require("../model/pyramid");
var TAG = "pyramid.dragon.achievement.list";

function start(postData, response, query, callBack) {
    var userUid = query["userUid"];
    var isIngot = false;
    var currentConfig;//配置
    var sTime = 0;//活动开始时间
    var eTime = 0;//活动结束时间
    var returnData = {};//返回用户初始化数据集合
    var userData = {};//返回用户初始化数据集合
    async.series([function (cb) {
        pyramid.getConfig(userUid, isIngot, function (err, res) {
            if (err) {
                cb(err);
            } else {
                currentConfig = res[2];
                sTime = res[0];
                eTime = res[1];
                cb();
            }
        });
    }, function (cb) {
        if (sTime <= jutil.now() && eTime >= jutil.now()) {
            cb();
        } else {
            cb("TIME ERROR");
        }
    }, function (cb) {
        pyramid.getPyramidData(userUid, sTime, currentConfig, isIngot, function (err, res) {
            userData = res;
            cb(err);
        });
    }, function (cb) {
        var achievementList = userData["achievement"];
        var currentScore = userData["times"] * 100;
        var tmpArr = {};
        for (var target in achievementList) {
            var reward = achievementList[target];
            if (currentScore >= target) {
                achievementList[target][0]["canGet"] = 1;//至少拥有一个子元素
                tmpArr[target] = reward;
            }
        }
        //save the data
        userData["achievement"] = achievementList;
        returnData["userData"] = userData;
        returnData["reward"] = tmpArr;
        pyramid.setPyramidData(userUid, sTime, userData, isIngot, cb);
    }], function (err, res) {
        echo(err, returnData);
    });

    function echo(err, res) {
        // 是否需要回调
        if (callBack && typeof(callBack) == "function") {
            callBack(1, userData);
        }
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, res);
        }
    }
}
exports.start = start;