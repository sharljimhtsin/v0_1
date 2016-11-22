/**
 * Created by xiayanxin on 2016/7/26.
 */

var async = require("async");
var practiceTribute = require("../code/model/practiceTribute");
var sTime;
var eTime;
var currentConfig;
var isAll;
var userData;
var userList = [[27481081926, 40],
    [27481081509, 1],
    [27481081447, 60],
    [27481080909, 12],
    [27481079997, 120],
    [27363641002, 50],
    [27296531461, 10],
    [26977764071, 100],
    [26877101328, 50],
    [26709328786, 20],
    [26642221163, 42],
    [26373786004, 120],
    [26289898410, 50],
    [26256344732, 50],
    [26122125654, 121],
    [25971143132, 24],
    [25937627141, 60],
    [25904077332, 22],
    [25904071877, 28],
    [25870504135, 31],
    [25853691625, 10],
    [25786654244, 21],
    [18706595992, 211],
    [18706595931, 50],
    [18706595921, 300],
    [18706595847, 600],
    [18706595842, 100],
    [18639487064, 20],
    [18287165910, 11],
    [18152948153, 120],
    [18069061646, 2400],
    [17196842071, 410],
    [17196763678, 150],
    [13153373132, 2],
    [12952032689, 1449],
    [12935254231, 120]];
var userListTmp = [[17163091969, 200]];
async.eachSeries(userListTmp, function (item, uCb) {
    var uId = item[0];
    var score = item[1];
    console.log(uId, score);
    async.series([function (cb) {
        practiceTribute.getConfig(uId, function (err, res) {
            if (err)cb(err);
            else {
                sTime = res[0] - 0;
                eTime = res[1] - 0;
                currentConfig = res[2];
                isAll = parseInt(currentConfig["isAll"]) || 0;
                cb(null);
            }
        });
    }, function (cb) {
        practiceTribute.getUserData(uId, sTime, function (err, res) {
            userData = res;
            userData["data"] = parseInt(userData["data"]) + parseInt(score);
            cb(err);
        });
    }, function (cb) {
        practiceTribute.setUserData(uId, userData, isAll, cb);
    }], function (err, res) {
        console.log(err);
        uCb();
    });
}, function (err, res) {
    console.log(err, res);
});