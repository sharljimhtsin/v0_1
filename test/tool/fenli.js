/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-5-28
 * Time: 下午5:04
 * To change this template use File | Settings | File Templates.
 */
//打包版本 负责打包所有平台的版本
var crypto = require("crypto");
var packageList = [{"pk": "configlist", "isScript": false}, {"pk": "material", "isScript": false}, {
    "pk": "oui",
    "isScript": false
}, {"pk": "resources", "isScript": false}, {"pk": "scripts", "isScript": true}];
var rootUrl = "/data/svnCode/code/";
var storeUrl = "/data/htdocs/p91/";
var fs = require("fs");
var platform = "CHS"; //当前需要打包的渠道tw(台湾) "china"(国内)
function beginPacket() {
    var arg = process.argv.splice(2);
    if (arg != undefined && arg.length > 0) {
        platform = arg[0];
        storeUrl = arg[1];
        rootUrl = arg[2];
    }
    for (var i in packageList) {
        var pk = packageList[i]["pk"];
        var isScript = packageList[i]["isScript"];
        packet(pk, isScript);
    }
    packetSound();
}

function packet(pk, isScript) {
    cleanDir(storeUrl + pk);
    if (isScript) {
        var cjson = require(rootUrl + pk + "/" + pk + ".json");
    } else {
        var cjson = require(rootUrl + pk + "/" + platform + "/" + pk + ".json");
    }
    for (var i in cjson) {
        var item = cjson[i];
        var platFormUrl = rootUrl + pk + "/" + platform + "/" + item["url"];
        var moveToUrl = storeUrl + "/" + pk + "/" + item["url"];
        if (isScript) {
            platFormUrl = rootUrl + pk + "/" + item["url"];
            var lastIndexOfDot = item["url"].lastIndexOf("/");
            var fileName = item["url"].substring(lastIndexOfDot + 1);
            var file = item["url"].substring(0, lastIndexOfDot) + "/" + platform + "/" + fileName;
            var tempPath = rootUrl + pk + "/" + file;
            if (fs.existsSync(tempPath)) {
                platFormUrl = tempPath;
            }
        }
        item["key"] = moveTo(platFormUrl, moveToUrl);
        if (item.hasOwnProperty("script")) {
            platFormUrl = rootUrl + pk + "/" + platform + "/" + item["script"]; //标准地址
            moveToUrl = storeUrl + pk + "/" + item["script"];
            moveTo(platFormUrl, moveToUrl);
        }
    }
    produceConfig(cjson, storeUrl + pk + "/" + pk + ".json");
}

function packetSound() {
    var jsonArray = [];
    var soundPacketUrl = "resources/" + platform + "/sound";
    var moveSoundUrl = "resources/sound";
    readFile(soundPacketUrl, null, moveSoundUrl);
    for (var i = 0; i < jsonArray.length; i++) {
        item = jsonArray[i];
        platFormUrl = rootUrl + item["url"];
        moveToUrl = storeUrl + item["url2"];
        moveTo(platFormUrl, moveToUrl);
    }
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
                var itemObj = {
                    "url": fileUrl,
                    "url2": moveSoundUrl,
                    "type": fileItemArray[1],
                    "name": fileItemArray[0]
                };
                jsonArray.push(itemObj);
            }
        }
        return jsonArray;
    }
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

function createSync(url) {
    var arr = url.split("/");
    var arrLength = arr.length;
    var file = "";
    for (var i = 0; i < arrLength - 1; i++) {
        var item = arr[i];
        file += (item + "/");
        if (fs.existsSync(file)) {
            //console.log(file+'已经创建过此更新目录了');
        } else {
            fs.mkdirSync(file);
            //console.log(file+'更新目录已创建成功\n');
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

beginPacket();