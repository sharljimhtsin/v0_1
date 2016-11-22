var fs = require("fs");
var arg = process.argv.splice(2);
var filePath = "/data/node/";
var p = "p91";
var vnum = '';
if (arg != undefined && arg.length > 0) {
    p = arg[1];
    if (arg.length > 2) {
        filePath = "/data/svnCode/node/";
        var path = arg[2];
        var files = fs.readdirSync("/data/dragonballsrc/" + arg[2] + "/");
        vnum = 0;
        for (var i in files) {
            if (files[i].substr(1) - 0 > vnum)
                vnum = files[i].substr(1) - 0;
        }
        vnum = 'v' + vnum;
        filePath += arg[0];
    } else {
        filePath += arg[0] + '/v0_1';
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
    //console.log(version);
    jsonObj["version"] = version;
    for (var i in jsonObj["list"]) {
        jsonObj["list"][i]["version"] = version;
        if (arg[2] != null) {
            var serverPath = jsonObj["list"][i]["serverPath"];
            serverPath = serverPath.replace(/v\d+/, vnum);
            //console.log(serverPath);
            jsonObj["list"][i]["serverPath"] = serverPath;
        }
    }
    versionStr = JSON.stringify(jsonObj, null, 2);
    fs.writeFileSync(filePath + p + ".json", versionStr, "utf-8");
} catch (error) {
    versionStr = "";
}
