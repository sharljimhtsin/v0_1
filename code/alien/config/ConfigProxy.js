/**
 * User: liyuluan
 * Date: 14-1-20
 * Time: 下午2:31
 */


function ConfigProxy(config,configUtil) {
    this.init(config, configUtil);
}

ConfigProxy.prototype.init = function(config, configUtil) {
    this._config = config;
    this._configUtil = configUtil;
    this._delKey = null;
    this._retainKey = null;
    this._delKey_C = null;
    this._retainKey_C = null;
    if (config instanceof  Array) {
        this.ids = [];
    } else {
        try {
            this.ids = Object.keys(config);
        } catch(err) {
            console.error(err.stack, config);
        }
    }

}



/**
 * 返回一个id是否存在于当前配置
 * @param id
 * @returns {boolean}
 */
ConfigProxy.prototype.in = function(id) {
    var mid = id.toString();
    return (this.ids.indexOf(mid) != -1);
}

/**
 * 返回给服务器端的配置
 * @returns {}
 */
ConfigProxy.prototype.toServerConfig = function() {
    if (this._delKey == "all") return null;

    if (this._delKey != null) {
        var newConfig = (this._config instanceof Array) ? [] : {};
        for (var key in this._config) {
            newConfig[key] = this._delKeyHandler(this._config[key], this._delKey);
        }
        return newConfig;
    } else if (this._retainKey != null) {
        var newConfig = (this._config instanceof Array) ? [] : {};
        for (var key in this._config) {
            newConfig[key] = this._retainKeyHandler(this._config[key], this._retainKey);
        }
        return newConfig;
    }
    return this._config;
}

/**
 * 返回给客户端的配置
 */
ConfigProxy.prototype.toClientConfig = function() {
    if (this._delKey_C == "all") return null;

    if (this._delKey_C != null) {
        var newConfig = (this._config instanceof Array) ? [] : {};
        for (var key in this._config) {
            newConfig[key] = this._delKeyHandler(this._config[key], this._delKey_C);
        }
        return newConfig;
    } else if (this._retainKey_C != null) {
        var newConfig = (this._config instanceof Array) ? [] : {};
        for (var key in this._config) {
            newConfig[key] = this._retainKeyHandler(this._config[key], this._retainKey_C);
        }
        return newConfig;
    }
    return this._config;
}



ConfigProxy.prototype._delKeyHandler = function(obj, keyList) {
    var newObj = {};
    for (var key in obj) {
        if (keyList.indexOf(key) == -1) {
            newObj[key] = obj[key];
        }
    }
    return newObj;
}

ConfigProxy.prototype._retainKeyHandler = function(obj, keyList) {
    var newObj = {};
    for (var key in obj) {
        if (keyList.indexOf(key) != -1) {
            newObj[key] = obj[key];
        }
    }
    return newObj;
}




ConfigProxy.prototype.setDelKey = function(keyList) {
    this._delKey = keyList;
}


ConfigProxy.prototype.setRetainKey = function(keyList) {
    this._retainKey = keyList;
}



ConfigProxy.prototype.setDelKey_C = function(keyList) {
    this._delKey_C = keyList;
}


ConfigProxy.prototype.setRetainKey_C = function(keyList) {
    this._retainKey_C = keyList;
}




///////////////////////////////////////////////////////////////////////////验证相关

/**
 * 验证方法
 */
ConfigProxy.prototype.verify = function() {
    var mConfigData = this._config;
    var result = [];
    if (mConfigData instanceof Array) {
        for (var i = 0; i < mConfigData.length; i++) {
            var verifyItem = this.iterator(i, mConfigData[i]);
            if (verifyItem != 1) {
                result.push({"key":i, "error": verifyItem});
            }
        }
    } else {
        for (var key in mConfigData) {
            var verifyItem = this.iterator(key, mConfigData[key]);
            if (verifyItem != 1) {
                result.push({"key":key, "error": verifyItem});
            }
        }
    }
    if (result.length != 0) {
        var str = JSON.stringify(result, null, 2);
        return str;
    } else {
        return 1;
    }
}


ConfigProxy.prototype.iterator = function(key, itemConfig) {
    return 1;
}


/**
 * 验证一个id是否存在于某个或某些表中
 */
ConfigProxy.prototype.verifyExist = function(configItem, itemName, target, other) {
    var value = configItem[itemName];
    if (typeof other != "undefined" && value == other) return 1;
    for (var i = 0; i < target.length; i++) {
        var mItemName = target[i];
        if (this._configUtil.getConfigProxy(mItemName).in(value) == true) {
            return 1;
        }
    }
    return itemName + ":ID不存在";
}

ConfigProxy.prototype.joinVerify = function() {
    var str = "";
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] != 1) str += (arguments[i] + " ");
    }
    return (str == "") ? 1 : str;
}





ConfigProxy.extend = function(Child){
    var F = function(){};
    F.prototype = ConfigProxy.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.uber = ConfigProxy.prototype;
}

module.exports = ConfigProxy;




