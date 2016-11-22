//服务器入口

var http = require("http");
var url = require("url");
var qs = require("querystring");
var formidable = require("formidable");
var fs = require("fs");
var jutil = require("../../../code/utils/jutil");
var router = require("./router");
global.Da = require("../log/Log");
var serverConfig;

/**
 * @param config 服务器的配置 侦听端口，路径等
 * @param handle 处理器,对于某些路径需要单独处理函数的情况
 */
function start(isWork, masterPort) {
    var config = serverConfig;
	function onRequest(request,response) {
		var urlParse = url.parse(request.url,true);
		var pathname = urlParse.pathname;
		var query = urlParse.query;

        if(query["uploadMode"] == "upload") { //如果前端有uploadMode标记，则读取要上传的文件
            var form = new formidable.IncomingForm();
            form.parse(request, function(error, fields, files) {
                var postData = {};
                for(var dataKey in query) {
                    postData[dataKey] = query[dataKey];
                }
                postData['files'] = files;

                router.route(pathname,response,query,postData,request);
            });
        } else {
            _getPostObj(request,query, function(postData) {
                var ip = getClientIp(request);
                ip = ip.split(",")[0];
                query["clientIp"] = ip;
                router.route(pathname, response, query, postData, request);
            });
		}
	}
    var httpServer = http.createServer(onRequest);//创建服务器
    httpServer.timeout = 20000;
    if (isWork == true) {
        httpServer.listen(masterPort);
        return httpServer;
    } else {
        var mPort = config["server"]["listen"];//端口
        httpServer.listen(mPort)
        return httpServer;
    }
}

//取得post上来的数据
function _getPostObj(request,query,fn) {
    var postDataStr = '';
    var postData = null;
    request.setEncoding("utf8");

    request.addListener("data", function(postDataChunk) {
        postDataStr += postDataChunk;
    });

    request.addListener("end", function() {
        if (postDataStr != "") {
            postDataStr = postDataStr.replace(/\'/g,"");
            var postDataObj = qs.parse(postDataStr);

            if (serverConfig["server"]["postData"] === "json") { //如果postData设置为json则取post中的data为post数据，忽略其它
                var postDataObjData = postDataObj["data"];
                if (postDataObjData != null) {
                    try {
                        postData = JSON.parse(postDataObjData);
                    } catch (err) {
                        postData = postDataObj;
                        console.error("server.js ---------" + postDataObjData, err.stack);
                        fs.appendFile('jsonError.log', jutil.now() + " | " + err + " | " + postDataObjData + "\n", 'utf8');
                    }
                } else {
                    postData = postDataObj;
                }
            } else {
                postData = postDataObj;
            }
        } else if(serverConfig["server"]["isDebug"] === true) {//debug模式下把get请求中的postData的参数转成post数据
            if (query["postData"] != null) {
                var queryDataStr = query["postData"];
                queryDataStr = queryDataStr.replace(/\'/g, "");
                try {
                    postData = JSON.parse(queryDataStr);
                } catch (error) {
                    console.error(error.stack);
                    fs.appendFile('jsonError.log', jutil.now() + " | " + error + " | " + queryDataStr + "\n", 'utf8');
                }
            }
        }
        if (postData == null && query["data"] != undefined) {
            var queryDataStr = query["data"];
            queryDataStr = queryDataStr.replace(/\'/g, "");
            try {
                postData = JSON.parse(queryDataStr);
            } catch (error) {
                console.error(error.stack);
                fs.appendFile('jsonError.log', jutil.now() + " | " + error + " | " + queryDataStr + "\n", 'utf8');
            }
        }
        fn(postData);
    });
}

function getClientIp(req) {
    return req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
};

/**
 * 设置服务器配置
 * @param config
 */
function setConfig(config) {
    serverConfig = config;
}

function getConfig() {
    return serverConfig;
}

var _path = "";

function setPath(path) {
    _path = path;
}

function getPath() {
    return _path;
}


exports.start = start;
exports.setConfig = setConfig;
exports.getConfig = getConfig;
exports.setPath = setPath;
exports.getPath = getPath;