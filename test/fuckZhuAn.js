/**
 * Created by xiazhengxin on 2016/3/18 6:04.
 */

var async = require("async");
var jutil = require("../code/utils/jutil");
var activityData = require("../code/model/activityData");

var argList = [12901703500];
var defaultHole = {
    "id": -2,
    "lv": 0,
    "lock": 0,
    "type": 0,
    "value": 0,
    "payLockPoint": 0
};
async.forEachSeries(argList, function (arg, forCb) {
    console.log(arg, 'start');
    var userData;
    async.series([function (queueCb) {
        activityData.getActivityData(arg, activityData.BAHAMUTWISH, function (err, res) {
            userData = res;
            queueCb(err);
        });
    }, function (queueCb) {
        var jsonObj = JSON.parse(userData["arg"]);
        var ballList = jutil.deepCopy(jsonObj["ballList"]);
        for (var index in ballList) {
            var ball = jutil.deepCopy(ballList[index]);
            if (ball["lv"] > 0) {
                ball["point"] = ball["lv"];
                ball["payPoint"] = 0;
                var holeList = [];
                holeList.push(defaultHole);
                holeList.push(defaultHole);
                holeList.push(defaultHole);
                holeList.push(defaultHole);
                holeList.push(defaultHole);
                ball["holeList"] = holeList;
            }
            ballList[index] = ball;
        }
        jsonObj["ballList"] = ballList;
        userData["arg"] = JSON.stringify(jsonObj);
        queueCb();
    }, function (queueCb) {
        activityData.updateActivityData(arg, activityData.BAHAMUTWISH, userData, queueCb);
    }, function (queueCb) {
        queueCb();
    }, function (queueCb) {
        queueCb();
    }, function (queueCb) {
        queueCb();
    }], function (err, res) {
        console.log(arg, 'end');
        forCb(err);
    });
}, function (err) {
    console.log(err);
    process.exit();
});