/**
 * Created by xiazhengxin on 2016/3/21 5:00.
 */

var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var async = require("async");
var fs = require("fs");

function start(postData, response, query, authorize) {
    var startTime = postData["startTime"];
    var endTime = postData["endTime"];
    var userName = postData["userName"];
    var logModel = postData["logModel"];
    var uid = query["uid"];
    var country = query["country"];
    var wholeData;
    var csv = "userName,model,time,data,operateId,\n";
    var fileName = "export" + jutil.nowMillisecond() + ".csv";
    async.series([function (cb) {
        admin.searchOperationLog(country, userName, logModel, startTime, endTime, function (err, res) {
            wholeData = res;
            cb(err);
        });
    }, function (cb) {
        for (var row in wholeData) {
            row = wholeData[row];
            var rowArr = [];
            rowArr.push(row["userName"]);
            rowArr.push(row["model"]);
            rowArr.push(row["time"]);
            rowArr.push(row["action"]);
            rowArr.push(row["operateId"]);
            csv += rowArr.join(",");
            csv += "\n";
        }
        cb();
    }, function (cb) {
        fs.writeFileSync("v0_1/code/html/" + fileName, csv);
        cb();
    }], function (err, res) {
        if (err) {
            response.echo("operationLog.export", jutil.errorInfo(err));
        } else {
            response.echo("operationLog.export", {"fileName": fileName});
        }
    });
}
exports.start = start;