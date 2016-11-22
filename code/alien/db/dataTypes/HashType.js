/**
 * Hash 处理
 * User: liyuluan
 * Date: 14-1-14
 * Time: 下午5:49
 */

/**
 * Hash 操作类
 */

function Hash(client, fullkey, isLog) {
    this.client = client;
    this.fullkey = fullkey;
    this.isLog = isLog;
    if (arguments.length == 4 && arguments[3]) {
        var expireTime = arguments[3];
        this.expire(expireTime, function () {
            // do nothing
        });
    }
}

/**
 * 将一个object以json方式存入
 */
Hash.prototype.setJSON = function (name, jsonValue, callbackFn) {
    try {
        var str = JSON.stringify(jsonValue);
    } catch (err) {
        callbackFn(err);
        return;
    }
    this.client.hset(this.fullkey, name, str, callbackFn);
};

Hash.prototype.setJSONex = function (seconds, name, jsonValue, callbackFn) {
    try {
        var str = JSON.stringify(jsonValue);
    } catch (err) {
        callbackFn(err);
        return;
    }
    var mThis = this;
    this.client.hset(this.fullkey, name, str, function (err, res) {
        mThis.expire(seconds, callbackFn);
    });
};

/**
 * 将一个key中取出一个值并返回json解析后的 object
 */
Hash.prototype.getJSON = function (name, callbackFn) {
    this.client.hget(this.fullkey, name, function (err, res) {
        if (err) callbackFn(err);
        else {
            if (res == null) {
                callbackFn(null, null);
                return;
            }
            try {
                var mObj = JSON.parse(res);
            } catch (err) {
                callbackFn(err);
                return;
            }
            callbackFn(null, mObj);
        }
    });
};

/**
 * 以json解析每个hash的值并返回
 */
Hash.prototype.getAllJSON = function (callbackFn) {
    this.client.hgetall(this.fullkey, function (err, res) {
        if (err) callbackFn(err);
        else {
            if (res == null) {
                callbackFn(null, null);
                return;
            }
            try {
                var newObj = {};
                for (var key in res) {
                    newObj[key] = JSON.parse(res[key]);
                }
            } catch (err) {
                callbackFn(err);
                return;
            }
            callbackFn(null, newObj);
        }
    });
};

/**
 * 将整个object或array 存入redis, 第一层key做为hash的key, key中的值用json转为字符串存入
 */
Hash.prototype.setAllJSON = function (jsonValue, callbackFn) {
    var arg = [];
    try {
        arg.push(this.fullkey);
        for (var mKey in jsonValue) {
            arg.push(mKey);
            arg.push(JSON.stringify(jsonValue[mKey]));
        }
        arg.push(callbackFn);
    } catch (err) {
        callbackFn(err);
        return;
    }
    this.client.hmset.apply(this.client, arg);
};

Hash.prototype.setAllJSONex = function (seconds, jsonValue, callbackFn) {
    var arg = [];
    try {
        arg.push(this.fullkey);
        for (var mKey in jsonValue) {
            arg.push(mKey);
            arg.push(JSON.stringify(jsonValue[mKey]));
        }
    } catch (err) {
        callbackFn(err);
        return;
    }
    var mThis = this;
    var cb = function (err, res) {
        mThis.expire(seconds, callbackFn);
    };
    arg.push(cb);
    this.client.hmset.apply(this.client, arg);
};

/**
 * 同setAllJSON， 区别在于存入用的是数组，  keyName,为数组中的的哪一个做为 hash的key值
 *
 */
Hash.prototype.setAllJSONFromArray = function (jsonArray, keyName, callbackFn) {
    var arg = [];
    try {
        arg.push(this.fullkey);
        for (var i = 0; i < jsonArray.length; i++) {
            var mObj = jsonArray[i];
            arg.push(mObj[keyName]);
            delete mObj[keyName];
            delete mObj["userUid"];
            arg.push(JSON.stringify(mObj));
        }
        arg.push(callbackFn);
    } catch (err) {
        callbackFn(err);
        return;
    }
    this.client.hmset.apply(this.client, arg);
};


////////////////////////////// 非json接口


/**
 * 设置hash一个字段值
 */
Hash.prototype.set = function (name, value, callbackFn) {
    this.client.hset(this.fullkey, name, value, callbackFn);
};

Hash.prototype.setex = function (seconds, name, value, callbackFn) {
    this.client.hset(this.fullkey, name, value, callbackFn);
    this.expire(seconds, function () {
        // none
    });
};

/**
 * 取hash一个字段值
 */
Hash.prototype.get = function (name, callbackFn) {
    this.client.hget(this.fullkey, name, callbackFn);
};


/**
 * 直接将一个obj存入hash中(obj只能单层)
 */
Hash.prototype.setObj = function (obj, callbackFn) {
    var arg = [];
    arg.push(this.fullkey);
    for (var mKey in obj) {
        if (typeof obj[mKey] !== "function") {
            arg.push(mKey);
            arg.push(obj[mKey]);
        }
    }
    arg.push(callbackFn);
    this.client.hmset.apply(this.client, arg);
};

Hash.prototype.setObjex = function (seconds, obj, callbackFn) {
    var arg = [];
    arg.push(this.fullkey);
    for (var mKey in obj) {
        if (typeof obj[mKey] !== "function") {
            arg.push(mKey);
            arg.push(obj[mKey]);
        }
    }
    arg.push(callbackFn);
    this.client.hmset.apply(this.client, arg);
    this.expire(seconds, function () {
        // none
    });
};

/**
 * 直接返回obj
 */
Hash.prototype.getObj = function (callbackFn) {
    this.client.hgetall(this.fullkey, callbackFn);
};


/**
 * 返回hash中多个name对应值
 */
Hash.prototype.mget = function (nameList, callbackFn) {
    var arg = [];
    arg.push(this.fullkey);
    for (var i = 0; i < nameList.length; i++) {
        arg.push(nameList[i]);
    }
    arg.push(callbackFn);
    this.client.hmget.apply(this.client, arg);
};

/**
 * 删除某些字段并返回
 * @param nameList
 * @param callbackFn
 */
Hash.prototype.mRemGet = function (nameList, callbackFn) {
    var mFullKey = this.fullkey;
    var mClient = this.client;
    var hmgetArg = [mFullKey].concat(nameList).concat(function (err, res) {
        var hdelArg = [mFullKey].concat(nameList).concat(function (err, res) {
            if (err) console.error(err.stack);
        });

        if (res == null) callbackFn(null, null);
        else {
            var timeArray = res;
            var returnObj = {};
            for (var i = 0; i < timeArray.length; i++) {
                returnObj[nameList[i]] = timeArray[i];
            }
            callbackFn(null, returnObj);
        }
        mClient.hdel.apply(mClient, hdelArg);
    });
    mClient.hmget.apply(mClient, hmgetArg);
};


/**
 * 删除这个hash
 */
Hash.prototype.del = function (callbackFn) {
    this.client.del(this.fullkey, callbackFn);
};

/**
 * 删除hash中的一个字段
 */
Hash.prototype.hdel = function (name, callbackFn) {
    this.client.hdel(this.fullkey, name, callbackFn);
};

/**
 * 自增或自减对应值
 */
Hash.prototype.hincrby = function (name, value, callback) {
    this.client.hincrby(this.fullkey, name, value, callback);
};


/**
 * 设置过期时间
 */
Hash.prototype.expire = function (seconds, callbackFn) {
    this.client.expire(this.fullkey, seconds, callbackFn);
};


/**
 * 判断是否有缓存
 * @param callbackFn
 */
Hash.prototype.exists = function (callbackFn) {
    this.client.exists(this.fullkey, callbackFn);
};

Hash.prototype.setnx = function (name, value, callbackFn) {
    this.client.hsetnx(this.fullkey, name, value, callbackFn);
};


module.exports = Hash;