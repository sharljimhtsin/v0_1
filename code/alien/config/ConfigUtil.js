/**
 * 配置校验、生成、转换工具
 * User: liyuluan
 * Date: 14-1-20
 * Time: 下午2:52
 */
var ConfigProxy = require("./ConfigProxy");

function ConfigUtil() {
    this._configObject = {};
    this._handler = {};
}

ConfigUtil.prototype.setConfigList = function(name, config) {
    if (config == null) {
        console.error(name, "配置为空");
    }
    this._configObject[name] = config;
}


//设置处理类
ConfigUtil.prototype.setHandler = function(name, handler) {
    this._handler[name] = new handler(this._configObject[name], this);
}


ConfigUtil.prototype.verify = function() {
    var mConfigObject = this._configObject;
    for (var key in mConfigObject) {
        if (this._handler[key] == null) this._handler[key] = new ConfigProxy(mConfigObject[key], this);

        var mHandler = this._handler[key];
        var verifyRes = mHandler.verify();
        if (verifyRes == 1) console.log(key + ": OK!");
        else {
            console.log(key + ": ERROR!");
            console.log(verifyRes);
        }
    }
}

ConfigUtil.prototype.getServerConfig = function() {
    var mConfigObject = this._configObject;
    var _newConfigObj = {};
    for (var key in mConfigObject) {
        if (this._handler[key] == null) this._handler[key] = new ConfigProxy(mConfigObject[key], this);

        var mHandler = this._handler[key];
        var _newConfigItem = mHandler.toServerConfig();
        if (_newConfigItem != null) _newConfigObj[key] = _newConfigItem;
    }
    return _newConfigObj;
}


ConfigUtil.prototype.getConfigProxy = function(name) {
    return this._handler[name];
}

module.exports = ConfigUtil;

