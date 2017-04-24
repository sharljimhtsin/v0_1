/**
 * REST 请求处理
 */
var fs = require("fs");
var Log = require("../log/Log");
var jutil = require("../../utils/jutil");

function start(filePath, restConfig, response, query, postData, request, noConcurrencyList) {
    var ip = request.headers['x-forwarded-for'] ||
        request.connection.remoteAddress ||
        request.socket.remoteAddress || "127.0.0.1";
    var queryMethod = query["method"];
    if (queryMethod == undefined) {
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.write("Please use the method");
        response.end();
    } else if (queryMethod.indexOf("/") != -1) {
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.write("Please use the method");
        response.end();
    } else {
        var timeOut = setTimeout(function () {
            var userUid = "";
            if (query != null && query["userUid"] != null) {
                userUid = query["userUid"];
            }
            var token = "";
            if (query != null && query["token"] != null) {
                token = query["token"];
            }
            var echoData = {};
            echoData[queryMethod] = {"ERROR": "serverTimeout", "info": "server Timeout"};
            response.end(JSON.stringify(echoData), "utf-8");
            Log.error("responseTimeOut", ip, queryMethod, 30000, userUid, token, postData);
        }, 18000);
        var modulePath = filePath + queryMethod + ".js";
        var checkMethod = restConfig["checkMethod"];
        if (typeof checkMethod === "undefined") {
            checkMethod = "checkToken.js";
        }

        getModule(filePath + checkMethod, function (err, res) {
            if (res === null) {
                response.writeHead(200, {'Content-Type': 'text/plain'});
                response.write("checkMethod not exist!");
                response.end();
            } else {
                res.check(queryMethod, postData, query, request, function (err, res) {
                    if (err === null) {
                        getModule(modulePath, function (err, res) {
                            clearTimeout(timeOut);
                            if (res === null) {
                                response.writeHead(200, {'Content-Type': 'text/plain'});
                                response.write("method not exist!");
                                response.end();
                            } else if (noConcurrencyList.hasOwnProperty(query["method"] + query["userUid"])) {
                                response.writeHead(200, {'Content-Type': 'text/plain'});
                                response.write("server is busy!");
                                response.end();
                            } else {
                                noConcurrencyList[query["method"] + query["userUid"]] = "1";// put 1 for avoid concurrency
                                res.start(postData, new PackageResponse(response, queryMethod, postData, query, request, noConcurrencyList), query, noConcurrencyList);
                            }
                        });
                    } else {
                        clearTimeout(timeOut);
                        response.writeHead(200, {'Content-Type': 'text/plain'});
                        if (query && query["callback"] != undefined) {
                            response.write(query["callback"] + '(' + res + ')');
                        } else {
                            response.write(res);
                        }
                        response.end();
                    }
                });

            }
        });
    }
}

var moduleExistFlag = {};//模块是否存在标记

//取一个模块
function getModule(filePath, callbackFn) {
    if (moduleExistFlag.hasOwnProperty(filePath) === false) {
        fs.exists(filePath, function (isExists) {
            if (isExists == 0) {
                callbackFn(null, null);
            } else {
                requireModule(filePath, callbackFn);
            }
        });
    } else {
        requireModule(filePath, callbackFn);
    }
}

function requireModule(filePath, callbackFn) {
    var aModule = require(filePath);
    callbackFn(null, aModule);
}

function PackageResponse(response, queryMethod, postData, query, request, noConcurrencyList) {
    this.ip = request.headers['x-forwarded-for'] ||
        request.connection.remoteAddress ||
        request.socket.remoteAddress || "127.0.0.1";
    this.host = request.headers['x-forwarded-host'] ||
        request.headers.host.split(":")[0];
    this.queryMethod = queryMethod;
    this.time = Date.now();
    this.response = response;
    this.postData = postData;
    this.query = query;
    this.noConcurrencyList = noConcurrencyList;
    var userUid = "";
    if (this.query != null && this.query["userUid"] != null) {
        userUid = this.query["userUid"];
    }
    var token = "";
    if (this.query != null && this.query["token"] != null) {
        token = this.query["token"];
    }
    this.timeOut = setTimeout(function () {
        var echoData = {};
        echoData[queryMethod] = {"ERROR": "serverTimeout", "info": "server Timeout"};
        response.end(JSON.stringify(echoData), "utf-8");
        Log.error("responseTimeOut", this.ip, queryMethod, 30000, userUid, token, postData);
    }, 18000);
}


var filterList = [
    "card.get",
    "skill.get",
    "friend.list",
    "mail.get",
    "notice.get",
    "user.get",
    "game.news",
    "fuse.get",
    "server.list",
    "item.get",
    "heroSoul.get",
    "specialTeam.get",
    "equipment.get",
    "map.get",
    "debris.get",
    "practice.get",
    "activeMap.get",
    "pve.bloodyBattle"
];

PackageResponse.prototype.echo = function (name, data) {
    var echoData = {};
    echoData[name] = data;
    this.response.writeHead(200, {"Content-Type": "text/plain", "charset": "utf-8"});
    var responseString = JSON.stringify(echoData);
    if (this.query && this.query.callback != undefined)
        this.response.end(this.query.callback + '(' + responseString + ')', "utf-8");
    else
        this.response.end(responseString, "utf-8");
    var mResponseTime = Date.now() - this.time;

    var userUid = "";
    if (this.query != null && this.query["userUid"] != null) {
        userUid = this.query["userUid"];
    }

    clearTimeout(this.timeOut);
    if (filterList.indexOf(this.queryMethod) == -1) {
        if (this.queryMethod == "battle.pve" && data != null) {
            var logObj = {};
            logObj["isWin"] = data["isWin"];
            logObj["mapDate"] = data["mapDate"];
            logObj["updateUser"] = data["updateUser"];
            logObj["heroGetExp"] = data["heroGetExp"];
            logObj["drop"] = data["drop"];
            responseString = JSON.stringify(logObj);
        }
        Log.sys("responseTime", this.ip, this.queryMethod, mResponseTime, userUid, this.postData, responseString);
    } else {
        Log.sys("responseTime", this.ip, this.queryMethod, mResponseTime, userUid, this.postData, "......");
    }
    delete this.noConcurrencyList[this.query["method"] + this.query["userUid"]];// delete the tag when done
};


PackageResponse.prototype.echoString = function (name, stringData) {
    var echoData = '{"' + name + '" :' + stringData + '}';
    this.response.writeHead(200, {"Content-Type": "text/plain"});
    this.response.end(echoData, "utf-8");
    var mResponseTime = Date.now() - this.time;
    var userUid = "";
    if (this.query != null && this.query["userUid"] != null) {
        userUid = this.query["userUid"];
    }
    clearTimeout(this.timeOut);
    Log.sys("responseTime", this.ip, this.queryMethod, mResponseTime, userUid, this.postData, "......");
    delete this.noConcurrencyList[this.query["method"] + this.query["userUid"]];// delete the tag when done
};

exports.start = start;