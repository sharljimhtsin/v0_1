//请求路由
var staticFilesHandler = require("./staticFilesHandler");
var restHandler = require("./restHandler");
var configHandler = require("./configHandler");
var nodeHandler = require("./nodeHandler");
var server = require("./server")
var path = require("path");


function route(name,response,query,postData,request) {
    var serverConfig = server.getConfig();
    var serverPath = server.getPath();
    var routerConfig = serverConfig["router"];
    var mType;
    var mServerPath = path.resolve(serverPath,serverConfig["server"]["path"]) + "/";
    var routerName = name.replace(/\/*/,"");
    routerName = routerName.split("/")[0];

    if (routerConfig.hasOwnProperty(routerName) === false) {
        routerName = "root";
    }

    mType = routerConfig[routerName]["type"];
    var mFilePath = mServerPath + routerConfig[routerName]["path"];

    switch (mType) {
        case "rest":
            restHandler.start(mFilePath,routerConfig[routerName],response,query,postData,request);
            break;
        case "static":
            staticFilesHandler.start(mFilePath + name,response,request);
            break;
        case "config":
            configHandler.start(mFilePath,response,query,postData);
            break;
        case "node":
            nodeHandler.start(mServerPath + name, response, query, postData, request);
            break;
    }
}
exports.route = route;



//	if (typeof handle[name] === 'function') {
//		handle[name](response,query,postData);
//	} else {
//        var nameArray = name.split("/");
//        if (nameArray.length >= 1 && nameArray[1] == "home") {
//            staticFilesHandler.start(name,response,request);
//        }else{
//            response.writeHead(404, {"Content-Type": "text/plain"});
//            response.write("404 Not found");
//            response.end();
//        }
//	}