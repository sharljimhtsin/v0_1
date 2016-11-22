/**
 * 静态文件处理
 * User: apple
 * Date: 13-5-31
 * Time: 下午5:43
 */
var path = require("path");
var fs = require("fs");
var server = require("./server");

var serverConfig;

var mimeObj ={"css": "text/css","gif": "image/gif","html": "text/html","ico": "image/x-icon",
    "jpeg": "image/jpeg","jpg": "image/jpeg","js": "text/javascript","json": "text/plain",
    "pdf": "application/pdf","png": "image/png","svg": "image/svg+xml","swf": "application/x-shockwave-flash",
    "tiff": "image/tiff","txt": "text/plain","wav": "audio/x-wav","wma": "audio/x-ms-wma","wmv": "video/x-ms-wmv",
    "xml": "text/xml"};

var ExpiresMaxAge = 60*60*24*365*1000; //一年毫秒数


function start(filePath,response,request) {
//    var realPath = path.normalize(name.replace(/../g, ""));
//    realPath = "." + name;
    serverConfig = server.getConfig();

    var realPath = filePath;
    var pathHandle = function(realPath) {
        fs.stat(realPath,function(err, stats) {
            if (err) {
                response.writeHead(404, {'Content-Type': 'text/plain'});
                response.write("This request URL was not found on this server.");
                response.end();
            } else {
                if (stats.isDirectory()) {
                    realPath = path.join(realPath, "/", serverConfig["static"]["default"]);
                    pathHandle(realPath);
                } else {
                    var lastModified = stats.mtime.toUTCString();
                    var ifModifiedSince = "If-Modified-Since".toLowerCase();
                    response.setHeader("Last-Modified", lastModified);

                    var expires = new Date();
                    expires.setTime(expires.getTime() + ExpiresMaxAge);
                    response.setHeader("Expires", expires.toUTCString());
                    response.setHeader("Cache-Control", "max-age=" + ExpiresMaxAge);

                    if (request.headers[ifModifiedSince] && lastModified == request.headers[ifModifiedSince]) {
                        response.writeHead(304, "Not Modified");
                        response.end();
                    } else {
                        fs.readFile(realPath, "binary", function(err, file) {
                            if (err) {
                                response.writeHead(500, {'Content-Type': 'text/plain'});
                                response.end(err);
                            } else {
                                var ext = path.extname(realPath);
                                ext = ext ? ext.slice(1) : 'unknown';
                                var contentType = mimeObj[ext] || "text/plain";
                                response.writeHead(200, {'Content-Type': contentType});
                                response.write(file, "binary");
                                response.end();
                            }
                        });
                    }
                }
            }
        });
    }

    pathHandle(realPath);
}





exports.start = start;
