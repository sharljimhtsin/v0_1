var fs = require("fs");
var arg = process.argv.splice(2);
var filePath = "/data/node/";
var p = "p91";
var vnum = '';
if (arg != undefined && arg.length > 0) {
    p = arg[1];
    filePath += arg[0] + '/v0_1';
    if (arg[4] != null) {
        var path = arg[4];
        var files = fs.readdirSync("/data/dragonballsrc/" + path + "/");
        vnum = 0;
        for (var i in files) {
            if (files[i].substr(1) - 0 > vnum)
                vnum = files[i].substr(1) - 0;
        }
        vnum = 'v' + vnum;
    }
}
// 获得目录下v开头版本文件夹
filePath += '/config/version/';
var targetFile = filePath + p + ".json";
versionStr = fs.readFileSync(targetFile, "utf-8");
try {
    var jsonObj = JSON.parse(versionStr);
    var version = jsonObj["version"];
    var vArr = version.split(".");
    vArr[vArr.length - 1] = vArr[vArr.length - 1] - 0 + 1;
    version = vArr.join(".");
    if (arg[2] != null && arg[3] != null && arg[4] != null) {
        jsonObj["version"] = arg[2];
        var targets = arg[3].split("_");
        for (var i in targets) {
            i = targets[i];
            if (i == "") {
                continue;
            }
            jsonObj["list"][i]["version"] = arg[2];
            var serverPath = jsonObj["list"][i]["serverPath"];
            serverPath = serverPath.replace(/v\d+/, vnum);
            jsonObj["list"][i]["serverPath"] = serverPath;
        }
    } else {
        jsonObj["version"] = version;
        for (var i in jsonObj["list"]) {
            jsonObj["list"][i]["version"] = version;
        }
    }
    versionStr = JSON.stringify(jsonObj, null, 2);
    fs.writeFileSync(filePath + p + ".json", versionStr, "utf-8");
} catch (error) {
    versionStr = "";
}