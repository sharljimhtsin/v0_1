/**
 * 直接请求文件夹下的路径
 * User: liyuluan
 * Date: 14-2-10
 * Time: 下午12:17
 */
var fs = require("fs");
var jutil = require("../../utils/jutil");
var Log = require("../log/Log");

function start(filePath, response, query, postData, request) {
    var jsPath = filePath + ".js";
    var isExists = fs.existsSync(jsPath);


    if (isExists) {
        var module = require(filePath + ".js");

        if (module.start != null) {
            module.start(postData, response, query);
        }
    } else {
        response.writeHead(404, {'Content-Type': 'text/plain'});
        response.write("This request URL was not found on this server.");
        response.end();
    }
    Log.sys("notify", jutil.now(), filePath, postData, query);
}

exports.start = start;