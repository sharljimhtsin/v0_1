/**
 * Created with JetBrains WebStorm.
 * User: apple
 * Date: 13-8-8
 * Time: 下午12:44
 * To change this template use File | Settings | File Templates.
 */

var path = require("path");
var server = require("./code/alien/server/server");
var appConfig = require("./appConfig");
var cluster = require("cluster");
var childArgv = isChildProcess();
var isWork = childArgv[0];
var masterPort = childArgv[1];
var mConfigPath = require.resolve("./appConfig.json");
var fs = require("fs");
require("./code/alien/log/console");//載入自定義日志
var noConcurrencyList = {};
server.setPath(path.resolve(mConfigPath, '../code/'));
server.setConfig(appConfig);
if (fs.existsSync("./cron")) {
    var serverList = fs.readFileSync("./cron", "utf8").split(",");
    serverList.pop();
    var cron = require("./code/utils/Cron");
    for (var i in serverList) {
        cron.addSever(serverList[i]);
    }
    require("./code/model/bloodReward");
}
process["httpServer"] = server.start(isWork, masterPort, noConcurrencyList);

//进程出错时处理
if (cluster.isWorker) {
    process.on('uncaughtException', function (err) {
        console.error(err.stack);
        cluster.worker.disconnect();
    });

    cluster.worker.on('disconnect', function () {
        // 工作进程断开了连接
        setTimeout(function () {
            process.exit(1);
        }, 30000);
    });
}


//是否是子进程
function isChildProcess() {
    var mArgv = process.argv;
    if (mArgv.length > 2) {
        var mValue = mArgv[2];
        var returnArr = [];
        returnArr[0] = (mValue == "child_process");
        returnArr[1] = mArgv[3] || 0;
        return returnArr;
    } else {
        return [false, 0];
    }
}