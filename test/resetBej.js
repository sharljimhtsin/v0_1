/**
 * Created by xiazhengxin on 2016/12/1.
 */

var bloodReward = require("../code/model/bloodReward");
var login = require("../code/model/login");
var jutil = require("../code/utils/jutil");
var async = require("async");

login.getServerCitys("r", 0, function (err, res) {
    if (err) {
        console.log(jutil.formatTime("Y-m-d H:i:s", jutil.now()));
    }
    async.eachSeries(res, function (city, cb) {
        bloodReward.bejDataRresh("r", city, function (err, res) {
            console.log("doing", city, err, res);
            cb();
        });
    }, function (err, res) {
        console.log("end", err, res);
    });
});


// bloodReward.bejFresh("77393297533", function (err, res) {
//     console.log(err, res);
// });