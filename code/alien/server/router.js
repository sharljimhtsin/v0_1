//请求路由
var staticFilesHandler = require("./staticFilesHandler");
var restHandler = require("./restHandler");
var configHandler = require("./configHandler");
var nodeHandler = require("./nodeHandler");
var server = require("./server");
var path = require("path");


function route(name, response, query, postData, request, noConcurrencyList) {
    var serverConfig = server.getConfig();
    var serverPath = server.getPath();
    var routerConfig = serverConfig["router"];
    var mType;
    var mServerPath = path.resolve(serverPath, serverConfig["server"]["path"]) + "/";
    var routerName = name.replace(/\/*/, "");
    routerName = routerName.split("/")[0];

    if (routerConfig.hasOwnProperty(routerName) === false) {
        routerName = "root";
    }

    mType = routerConfig[routerName]["type"];
    var mFilePath = mServerPath + routerConfig[routerName]["path"];

    switch (mType) {
        case "rest":
            restHandler.start(mFilePath, routerConfig[routerName], response, query, postData, request, noConcurrencyList);
            break;
        case "static":
            staticFilesHandler.start(mFilePath + name, response, request);
            break;
        case "config":
            configHandler.start(mFilePath, response, query, postData);
            break;
        case "node":
            nodeHandler.start(mServerPath + name, response, query, postData, request);
            break;
    }
}
exports.route = route;