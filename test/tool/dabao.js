/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-5-28
 * Time: 下午5:04
 * To change this template use File | Settings | File Templates.
 */
//打包版本 负责打包所有平台的版本
var crypto = require("crypto");
var configList = "";
var material = "";
var oui = "";
var resources = "";
var scripts = "";
var rootUrl = "/data/svnCode/code/";
var storeUrl = "/data/htdocs/p91/";
var fs = require("fs");
var isDebug = false;
var mulityLanguage = false;//是否要多平台打包
var currentPlatform = ["CHS"]; //当前需要打包的渠道tw(台湾) "china"(国内)
var Hzip = require("hzip");
var packetIndex = 0;
var currentPlatformIndex = 0;
function beginPacket() {
    var currentPlatformLength = currentPlatform.length;
    if (packetIndex < currentPlatformLength) {
        configList = require(rootUrl + "configlist/" + currentPlatform[packetIndex] + "/configlist.json");
        material = require(rootUrl + "material/" + currentPlatform[packetIndex] + "/material.json");
        oui = require(rootUrl + "oui/" + currentPlatform[packetIndex] + "/oui.json");
        resources = require(rootUrl + "resources/" + currentPlatform[packetIndex] + "/resources.json");
        scripts = require(rootUrl + "scripts/scripts.json");
        packetConfig(currentPlatform[packetIndex], callPacket);
        packetResources(currentPlatform[packetIndex], callPacket);
        packetScripts(currentPlatform[packetIndex], callPacket);
        packetOui(currentPlatform[packetIndex], callPacket);
        packetMaterial(currentPlatform[packetIndex], callPacket);
    }
//}
}

function callPacket() {
    currentPlatformIndex++;
    if (currentPlatformIndex == 5) {
        currentPlatformIndex = 0;
        packetIndex++;
        beginPacket();
    }
}
function replaceString(str) {
    var length = str.length;
    var index = 0;
    for (var i = 0; i < length; i++) {
        if (str.charAt(i) == "." && i > 10) {
            index = i;
            break;
        }
    }
    var replaceStr = str.substr(index, length - index);
    var returnString = str.replace(replaceStr, ".zip");
    return returnString;
}
function zipFile(readUrl, writeUrl, name, item, cb) {//压缩文件
    var zipString = replaceString(writeUrl);
    var file = fs.openSync(zipString, "w");
    var hzip = new Hzip(fs.readFileSync(zipString));
    fs.closeSync(file);
    hzip.updateEntry(name, fs.readFileSync(readUrl), function (err, buffer) {
        if (err) console.log(err);
        if (fs.existsSync(zipString) === true) fs.unlinkSync(zipString);
        fs.writeFileSync(zipString, buffer);
        if (fs.existsSync(readUrl) === true) fs.unlinkSync(readUrl);
        var fileStat = fs.lstatSync(zipString);
        item["size"] = fileStat["size"];
        cb();
    });
}
/**
 * 配置表打包
 */
function packetConfig(platform, cb) { //处理configList
    var configLength = configList.length;
    var lanSepter = "";
    if (mulityLanguage == true) {
        lanSepter = platform + "/";
    }
    var zipLength = configLength;
    for (var i = 0; i < configLength; i++) {
        var item = configList[i];
        var platFormUrl = rootUrl + "configlist/" + platform + "/" + item["url"];
        var moveToUrl = storeUrl + "configlist/" + lanSepter + item["url"];
        var fileMd5 = moveTo(platFormUrl, moveToUrl);
        item["key"] = fileMd5;
        item["isZip"] = true;
        zipFile(moveToUrl, moveToUrl, item["name"] + ".json", item, function () {
            zipLength--;
            if (zipLength == 0) {
                produceConfig(configList, storeUrl + "configlist/" + lanSepter + "configlist.json");
                cb();
            }
        });
    }
}
/**
 * 资源文件打包
 * @param platform
 */
function packetResources(platform, cb) {
    var resourceLength = resources.length;
    var lanSepter = "";
    if (mulityLanguage == true) {
        lanSepter = platform + "/";
    }
    var zipLength = 0;
    for (var i = 0; i < resourceLength; i++) {
        var item = resources[i];
        var platFormUrl = rootUrl + "resources/" + platform + "/" + item["url"];
        var moveToUrl = storeUrl + "resources/" + lanSepter + item["url"];
        var fileMd5 = moveTo(platFormUrl, moveToUrl);
        item["key"] = fileMd5;
        if (item["type"] == "lang" || item["type"] == "json") {
            item["isZip"] = true;
            item["type"] = "json";
            zipLength++;
            zipFile(moveToUrl, moveToUrl, item["name"] + ".json", item, function () {
                zipLength--;
                if (zipLength == 0) {
                    produceConfig(resources, storeUrl + "resources/" + lanSepter + "resources.json");
                    cb();
                }
            });
        } else {
            var fileStat = fs.lstatSync(moveToUrl);
            item["size"] = fileStat["size"];
        }
    }
    var soundPacketUrl = "resources/" + platform + "/sound";
    var moveSoundUrl = "resources/sound";//音乐这里居然没分开
    //var moveSoundUrl = "resources/"+lanSepter+"sound";
    readFile(soundPacketUrl, null, moveSoundUrl);
    for (var i = 0; i < jsonArray.length; i++) {
        item = jsonArray[i];
        platFormUrl = rootUrl + item["url"];
        moveToUrl = storeUrl + item["url2"];
        moveTo(platFormUrl, moveToUrl);
    }
    produceConfig(resources, storeUrl + "resources/" + lanSepter + "resources.json");
}
var jsonArray = [];
function readFile(fileUrl, item, moveSoundUrl) {
    var stat = fs.lstatSync(rootUrl + fileUrl);
    if (stat.isDirectory() == 1) {
        var list = fs.readdirSync(rootUrl + fileUrl);
        for (var q = 0; q < list.length; q++) {
            readFile(fileUrl + "/" + list[q], list[q], moveSoundUrl + "/" + list[q]);
        }
    } else {
        var fileItemArray = item.split(".");
        if (fileItemArray.length == 2) {
            var itemObj = {"url": fileUrl, "url2": moveSoundUrl, "type": fileItemArray[1], "name": fileItemArray[0]};
            jsonArray.push(itemObj);
        }
    }
    return jsonArray;
}

/**
 * 脚本打包
 * @param platform
 */
function packetScripts(platform, cb) {
    var urlLength = scripts.length;
    var lanSepter = "";
    if (mulityLanguage == true) {
        lanSepter = platform + "/";
    }
    var createJCScriptUrl = storeUrl + "scripts/" + lanSepter + "jichang.js";
    var createMonaScriptUrl = storeUrl + "scripts/" + lanSepter + "monanudao.js";
    createSync(createJCScriptUrl);
    createSync(createMonaScriptUrl);
    var jcFile = fs.openSync(createJCScriptUrl, "w");
    var monaFile = fs.openSync(createMonaScriptUrl, "w");
    for (var i = 0; i < urlLength; i++) {
        var item = scripts[i];
        var writeUrl = "";
        var platFormUrl = rootUrl + "scripts/" + item["url"]; //标准地址
        var lastIndexOfDot = item["url"].lastIndexOf("/");
        var fileName = item["url"].substring(lastIndexOfDot + 1);
        var file = item["url"].substring(0, lastIndexOfDot) + "/" + platform + "/" + fileName;
        var tempPath = rootUrl + "scripts/" + file;
        if (fs.existsSync(tempPath)) {
            platFormUrl = tempPath;
        }
        var file = fs.openSync(platFormUrl, "r");
        var data = fs.readFileSync(platFormUrl);
        var itemUrl = item["url"];
        if (itemUrl.substr(0, 4) == "libs") {
            writeUrl = createMonaScriptUrl;
        } else {
            writeUrl = createJCScriptUrl;
        }
        fs.appendFileSync(writeUrl, data);
        fs.appendFileSync(writeUrl, "\n");
        fs.closeSync(file);
    }
    fs.closeSync(jcFile);
    fs.closeSync(monaFile);
    var jichangMd5 = moveTo(createJCScriptUrl, createJCScriptUrl);
    var monanudaoMd5 = moveTo(createMonaScriptUrl, createMonaScriptUrl);
    var aa = 0;
    var jcSize = 0;
    var monSize = 0;
    var item1 = {"url": "monanudao.js", "type": "js", "isZip": true, "key": monanudaoMd5};
    var item2 = {"url": "jichang.js", "type": "js", "isZip": true, "key": jichangMd5};
    zipFile(createJCScriptUrl, createJCScriptUrl, "jichang.js", item2, function () {
        aa++;
        if (aa == 2) {
            produceConfig([item1, item2], storeUrl + "scripts/" + lanSepter + "scripts.json");
            cb();
        }
    });
    zipFile(createMonaScriptUrl, createMonaScriptUrl, "monanudao.js", item1, function () {
        aa++;
        if (aa == 2) {
            produceConfig([item1, item2], storeUrl + "scripts/" + lanSepter + "scripts.json");
            cb();
        }
    });
}
/**
 * oui打包
 * @param platform
 */
function packetOui(platform, cb) {
    var ouiLength = oui.length;
    var zipLength = ouiLength;
    var lanSepter = "";
    if (mulityLanguage == true) {
        lanSepter = platform + "/";
    }
    for (var i = 0; i < ouiLength; i++) {
        var item = oui[i];
        var platFormUrl = rootUrl + "oui/" + platform + "/" + item["url"]; //标准地址
        var moveToUrl = storeUrl + "/oui/" + lanSepter + item["url"];
        var fileMd5 = moveTo(platFormUrl, moveToUrl);
        item["key"] = fileMd5;
        item["isZip"] = true;
        item["type"] = "json";
        zipFile(moveToUrl, moveToUrl, item["name"] + ".json", item, function () {
            zipLength--;
            if (zipLength == 0) {
                produceConfig(oui, storeUrl + "/oui/" + lanSepter + "oui.json");
                cb();
            }
        });
        if (item.hasOwnProperty("script")) {
            platFormUrl = rootUrl + "oui/" + platform + "/" + item["script"]; //标准地址
            moveToUrl = storeUrl + "oui/" + lanSepter + item["script"];
            moveTo(platFormUrl, moveToUrl);
        }
    }
}
/**
 * 贴图打包
 * @param platform
 */
function packetMaterial(platform, cb) {
    var materialLength = material.length;
    var ouiLength = oui.length;
    var lanSepter = "";
    if (mulityLanguage == true) {
        lanSepter = platform + "/";
    }
    for (var i = 0; i < materialLength; i++) {
        var item = material[i];
        var platFormUrl = rootUrl + "material/" + platform + "/" + item["url"]; //标准地址
        var moveToUrl = storeUrl + "material/" + lanSepter + item["url"];
        var fileMd5 = moveTo(platFormUrl, moveToUrl);
        var fileStat = fs.lstatSync(moveToUrl);
        item["size"] = fileStat["size"];
        item["key"] = fileMd5;
    }
    produceConfig(material, storeUrl + "material/" + lanSepter + "material.json");
    cb();
}
/**
 * 生成配置文件
 * @param arr
 * @param url
 */
function produceConfig(arr, url) {
    var arrL = arr.length;
    createSync(url);
    var file = fs.openSync(url, 'w');
    fs.appendFileSync(url, "[");
    for (var i = 0; i < arrL; i++) {
        var item = arr[i];
        fs.appendFileSync(url, JSON.stringify(item));
        if (i != arrL - 1) {
            fs.appendFileSync(url, ",");
        }
        fs.appendFileSync(url, "\n");
    }
    fs.appendFileSync(url, "]");
    fs.closeSync(file);
}
/**
 * 拷贝文件到另一个目录,顺便返回文件的MD5码
 * @param startUrl
 * @param endUrl
 */
function moveTo(startUrl, endUrl) {
    var md5 = crypto.createHash("md5");
    var fileLocket = fs.openSync(startUrl, "r");
    var locketData = fs.readFileSync(startUrl);
    fs.closeSync(fileLocket);
    createSync(endUrl);
    var fileUse = fs.openSync(endUrl, 'w');
    fs.appendFileSync(endUrl, locketData);
    md5.update(locketData);
    var result = md5.digest("hex");
    fs.closeSync(fileUse);
    return result;
}
function replaceStr(string, needReg, platForm) {
    var lastIndexOfDot = string.lastIndexOf(".");
    var fileName = string.substring(0, lastIndexOfDot);
    return fileName + "_" + platForm + string.substr(lastIndexOfDot);
}

/**
 * 创建文件夹
 * @param url
 */
function createSync(url) {
    var arr = url.split("/");
    var arrLength = arr.length;
    var file = "";
    for (var i = 0; i < arrLength; i++) {
        var item = arr[i];
        var itemArr = item.split(".");
        if (itemArr.length < 2) {
            file += (item + "/");
        } else {
            break;
        }
        if (fs.existsSync(file)) {
        } else {
            fs.mkdirSync(file);
        }
    }
}

function cleanDir(path) {
    if (fs.existsSync(path)) {
        var files = fs.readdirSync(path);
        files.forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.statSync(curPath).isDirectory()) {
                cleanDir(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}

var arg = process.argv.splice(2);
if (arg != undefined && arg.length > 0) {
    currentPlatform = arg[0].split(",");
    storeUrl = arg[1];
    rootUrl = arg[2];
    mulityLanguage = currentPlatform.length > 1;
}

cleanDir(storeUrl);
beginPacket();