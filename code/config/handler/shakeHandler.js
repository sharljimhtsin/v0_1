/**
 * User: liyuluan
 * Date: 14-1-22
 * Time: 下午4:40
 */


var ConfigProxy = require("../../alien/config/ConfigProxy");

function shakeHandler(config, configUtil){
    this.init(config, configUtil);

    this.toServerConfig = function() {
        var mConfig = this._config;
        var newConfig = {};
        newConfig["normal"] = configItemHandler(mConfig["normal"]);
        newConfig["activity"] = {};
        for (var key in mConfig["activty"]) {
            newConfig["activity"][key] = configItemHandler(mConfig["activty"][key]);
        }
        return newConfig;
    }
}

function configItemHandler(config) {
    var mProbValue = 0;
    for (var key in config) {
        mProbValue += (config[key]["prob"] - 0);
    }
    var newConfig = {};
    var probFlag = 0;
    for (var key in config) {
        var cProb = config[key]["prob"] - 0;
        var itemConfig = {};
        itemConfig["minProb"] = probFlag;
        probFlag = probFlag + cProb / mProbValue ;
        itemConfig["maxProb"] = probFlag ;

        itemConfig["content"] = contentHandler(config[key]["content"]);
        itemConfig["levelContent"] = levelContentHandler(config[key]["zeni"]);
        newConfig[key] = itemConfig;
    }
    return newConfig;
}

function contentHandler(obj) {
    if (obj == null) return null;
    var mArr = [];
    for (var key in obj) {
        var mId = key;
        if (key == "imegga") mId = "ingot";
        else if (key == "zeni") mId = "gold";
        mArr.push({"id":mId, "count": obj[key]});
    }
    return mArr;
}

function levelContentHandler(obj) {
    if (obj == null) return null;
    var levelObj = {};
    for (var key in obj) {
        levelObj[key] = [{"id":"gold", "count":obj[key]}];
    }
    return levelObj;
}


ConfigProxy.extend(shakeHandler);

module.exports = shakeHandler;
