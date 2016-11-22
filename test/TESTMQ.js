/**
 * Created by xiayanxin on 2016/7/8.
 */

var async = require("async");
var stats = require("../code/model/stats");
var gameStatFromCountry = require("../code/alien/log/Log").gameStatFromCountry;

var mq = gameStatFromCountry("i");
var v = [];
v[0] = 25;
v[1] = 1;
v[2] = 2;
v[3] = 3;
v[4] = 4;
v[6] = '';
v[7] = 7;
v[10] = 10;
v[11] = Date.now();
v[12] = "";
v[13] = "";
v[14] = "";
v[15] = "";
v[16] = "";
v[17] = "";
v[18] = "";
v[23] = "";
v[24] = 0;
v[26] = "";
v[27] = 1;
async.times(10, function (n, tCb) {
    mq.publish(v);
    tCb();
}, function (err, res) {
    console.log(err, res);
});
