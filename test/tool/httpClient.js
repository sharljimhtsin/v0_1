/**
 * User: apple
 * Date: 14-1-18
 * Time: 下午4:44
 * To change this template use File | Settings | File Templates.
 */
var http = require("http");
var urlParse = require("url").parse;
var qs = require("querystring");

/**
 * 发起一个http请求
 * @param url http地址
 * @param method POST 或 GET
 * @param sendData 发送的数据 JSON格式
 * @param callbackFn
 */
function httpRequest(url, method, sendData, callbackFn) {
    var urlData = urlParse(url);

    var options = {
        hostname:urlData.hostname,
        port:urlData.port || 80,
        path:urlData.path,
        method:method
    };


    var req = http.request(options, function(res) {
        var mStatusCode = res.statusCode;
        res.setEncoding('utf8');
        var mData = '';
        var sTime = Date.now();

        res.on('data', function(chunk) {
            mData += chunk;
        });
        res.on('end', function() {
            var mTime = Date.now() - sTime;
            var resultData = {};
            try {
                var mDataObj = JSON.parse(mData);
                resultData["data"] = mDataObj;
            } catch(err) {
                resultData["data"] = mData;
            }

            resultData["time"] = mTime;
            resultData["statusCode"] = mStatusCode;
            callbackFn(null, resultData);
        });
    });

    req.on("error", function(err) {
        callbackFn(err);
    });

    if (sendData == null) {
        req.end();
    } else {
        req.end(qs.stringify(sendData));
    }

}

function httpPost(url, sendData, callbackFn) {
    httpRequest(url, 'POST', sendData, callbackFn);
}

function httpGet(url, callbackFn) {
    httpRequest(url, 'GET', null, callbackFn);
}


/**
 * 通过配置表中的配置去请求一个方法
 * @param configUrl 配置表的路径
 * @param methodName 方法名
 * @param arg 外部变量
 * @param callbackFn
 */
function post_fc(configUrl, methodName, arg, callbackFn) {
    var configData = null;
    try {
        if (typeof configUrl === 'string') {
            configData = require(configUrl);
        } else {
            configData = configUrl;
        }
    } catch(err) {
        callbackFn(err);
        return;
    }
    var mArg = arg || {};
    fcRequest(configData, methodName, mArg, callbackFn);
}


function fcRequest(configData, methodName, arg, callbackFn) {
    var methodConfig = configData[methodName];
    if (methodConfig == null) {
        callbackFn("没有此方法");
        return;
    }
    var mUrl = null;

    if (arg != null && arg["_url"] != null) { //环境变量中有_url 则用 环境变量中的url
        mUrl = arg["_url"];
    } else if (methodConfig["url"] != null && methodConfig["url"] != "") { //方法中配置的url
        mUrl = methodConfig["url"];
    } else if (configData["default"] != null && configData["default"]["url"] != null){ //default配置的url
        mUrl = configData["default"]["url"];
    } else {
        callbackFn("找不到请求地址");
        return;
    }

    var argNeed = methodConfig["argNeed"];
    if (argNeed == null || argNeed == "") { //不依赖则发起请求
        var postUrl = fcGetUrl(mUrl, arg, methodName);
        var postData = fcGetPostData(methodConfig["arg"], arg);
        httpPost(postUrl, postData, callbackFn);
    } else {
        fcRequest(configData, argNeed, arg, function(err, res) {
            if (err) callbackFn(err);
            else {
                try {
                    var dataObj = res["data"];
                    for (var key in dataObj) {
                        var resultData = dataObj[key];
                        for (var key2 in resultData) {
                            if (typeof arg[key2] == "undefined") arg[key2] = resultData[key2];
                        }
                    }
                } catch(err) {
                    callbackFn(err);
                    return;
                }
                var postUrl = fcGetUrl(mUrl, arg, methodName);
                var postData = fcGetPostData(methodConfig["arg"], arg);
                httpPost(postUrl, postData, callbackFn);
            }

        });
    }
}


function fcGetUrl(url, arg, methodName) {
    return url.replace(/\$\{\w+\}/g, function(text) {
        var mText = text.replace(/\$\{(\w+)\}/,"$1");
        if (mText == "methodName") return methodName;
        else return arg[mText];
    });
}


function fcGetPostData(argConfig, arg) {
    if (argConfig == null) return null;
    var newData = {};
    for(var key in argConfig) {
        var mValue = argConfig[key];
        if (typeof mValue === "string" && mValue.indexOf("${") != -1) {
            var mText = mValue.replace(/\$\{(\w+)\}/,"$1");
            if (typeof arg[mText] != "undefined") {
                newData[key] = arg[mText];
            } else {
                newData[key] = mValue;
            }
        } else {
            newData[key] = mValue;
        }
    }
    var newDataStr = JSON.stringify(newData);
    return {"data":newDataStr};
}



/**
 * 变量查找逻辑
 *      优先：环境参数
 *      其次：need返回的结果中查找
 *      其次：default中查找
 */
var o = {
    "default":{
        "urlNeed":"getToken",
        "url":"http://127.0.0.1:8900/meth=${method}&userUid=${}&token=${}"
    },
    "getToken":{

    },
    "hero.get":{
        "url":"${url}",
        "argNeed":"",
        "arg":{
            "heroId":"${heroId}"
        }
    }
}




exports.post = httpPost;
exports.get = httpGet;
exports.fcRequest = fcRequest;
exports.post_fc = post_fc;
