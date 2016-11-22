/**
 * 配置文件处理器
 * User: liyuluan
 * Date: 14-1-20
 * Time: 下午3:40
 */


var fs = require("fs");
var pathResolve = require("path").resolve;
var dirname = require("path").dirname;
var ConfitUtil = require("../alien/config/ConfigUtil");
var jutil = require("../utils/jutil");



//加载所有config
function loadConfig(path, configUtil) {
    var _confitUtil = configUtil;
    var mPath = require.resolve(path + "configlist.json");
    mPath = dirname(mPath) + "/";
    var fileList = fs.readdirSync(mPath);

//    var fileList = require(path + "configlist.json");
    for (var i = 0; i < fileList.length; i++) {
        var itemString = fileList[i];
        var itemArray = itemString.split(".");
        if (itemArray.length > 1 && itemArray[1] == "json") {
            var configName = itemArray[0];
            if (configName != "configlist" && configName != "errorConfig") _confitUtil.setConfigList(configName, require(mPath + itemString)[configName]);
            if(configName == 'errorConfig' || configName == 'stopWord') jutil.setConfigList(configName, require(mPath + itemString));
        }
    }
}

function setHandler(configUtil) {
    configUtil.setHandler("hero", require("./handler/HeroHandler"));
    configUtil.setHandler("map", require("./handler/mapHandler"));
    configUtil.setHandler("shake", require("./handler/shakeHandler"));
}


exports.loadConfig = loadConfig;
exports.setHandler = setHandler;


//
//var mconfigUtil = new ConfitUtil();
//
//loadConfig("../../config/a/", mconfigUtil);
//setHandler(mconfigUtil);
////mconfigUtil.verify();
//var s = mconfigUtil.getServerConfig();
//var m = s["hero"];
//console.log(m);
