/**
 * redis 字符串类别的封装
 * User: liyuluan
 * Date: 14-1-6
 * Time: 下午3:38
 */

function StringType(client, fullkey, isLog) {
    this.client = client;
    this.fullkey = fullkey;
    this.isLog = isLog;
    if (arguments.length == 4 && arguments[3]) {
        var expireTime = arguments[3];
        this.expire(expireTime, function () {
            // do nothing
        });
    } else {
        //
    }
}


StringType.prototype.set = function (value, callbackFn) {
    this.client.set(this.fullkey, value, callbackFn);
};

StringType.prototype.setex = function (seconds, value, callbackFn) {
    this.client.setex(this.fullkey, seconds, value, callbackFn);
};


StringType.prototype.get = function (callbackFn) {
    this.client.get(this.fullkey, callbackFn);
};


StringType.prototype.getset = function (value, callbackFn) {
    this.client.getset(this.fullkey, value, callbackFn);
};


StringType.prototype.setObj = function (obj, callbackFn) {
    var mStr = JSON.stringify(obj);
    this.client.set(this.fullkey, mStr, callbackFn);
};

StringType.prototype.setObjex = function (seconds, obj, callbackFn) {
    var mStr = JSON.stringify(obj);
    this.client.setex(this.fullkey, seconds, mStr, callbackFn);
};

StringType.prototype.getObj = function (callbackFn) {
    this.client.get(this.fullkey, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else if (res == null) {
            callbackFn(null, null);
        } else {
            var mStr = res;
            var obj;
            try {
                var mObj = JSON.parse(mStr);
            } catch (e) {
                mObj = null;
            } finally {
                obj = mObj;
            }
            callbackFn(null, obj);
        }
    });
};


StringType.prototype.expire = function (seconds, callbackFn) {
    this.client.expire(this.fullkey, seconds, callbackFn);
};

StringType.prototype.del = function (callbackFn) {
    this.client.del(this.fullkey, callbackFn);
};

StringType.prototype.incr = function (callbackFn) {
    this.client.incr(this.fullkey, callbackFn);
};

StringType.prototype.incrby = function (value, callbackFn) {
    this.client.incrby(this.fullkey, value, callbackFn);
};

StringType.prototype.getTime = function (callbackFn) {
    this.client.time(function (err, res) {
        if (err) { //兼容狗日恺英服务器
            var s = Math.floor(Date.now() / 1000);
            callbackFn(null, [s, 0]);
        } else {
            callbackFn(null, res);
        }
    });
};

StringType.prototype.setnx = function (value, callbackFn) {
    this.client.setnx(this.fullkey, value, callbackFn);
};

//判断一个KEY是否存在
StringType.prototype.exists = function (callbackFn) {
    this.client.exists(this.fullkey, callbackFn);
};


//对某个key 进行加锁操作
StringType.prototype.lock = function (callbackFn) {
    var self = this;
    this.client.setnx(this.fullkey, 1, function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            if (res == 1) {
                callbackFn(null, 1);
                self.client.expire(self.fullkey, 300, function () {
                    //null
                });//如果5分钟没被解锁则失效
            } else {
                callbackFn(null, 0);
            }
        }
    });
};


//对某个key 进行解锁操作
StringType.prototype.unlock = function (callbackFn) {
    this.client.del(this.fullkey, callbackFn);
};


module.exports = StringType;