/**
 * 配置文件处理
 * User: apple
 * Date: 13-8-9
 * Time: 上午10:46
 */
var zlib = require("zlib");
var fs = require("fs");

function start(filePath,response,query,postData) {
    var configName = query["name"];
    if(typeof configName === "undefined") {
        response.writeHead(200, {"Content-Type": "text/plain"});
        response.write("please use name");
        response.end();
    } else {
        getFile(filePath,configName,function(err,res){
            if (res == null) {
                response.writeHead(200, {"Content-Type": "text/plain"});
                response.write("File does not exist ");
                response.end();
            } else {
                response.writeHead(200, {"Content-Type": "text/plain",'Content-Encoding': 'gzip'});
                response.write(res);
                response.end();
            }
        });
    }
}



//配置的加载缓存字典
var configDic = {};

/**
 * 取得一个配置文件
 * @param configName
 * @param fn
 */
function getFile(filePath, configName, fn) {
    var fullPath= filePath + configName;
    if(configDic[fullPath] != null) {
        fn(null,configDic[fullPath]);
    } else {
        fs.readFile(fullPath,function(err, res){
            var data = res;
            if (res == null) {
                fn(null, null);
            } else {
                zlib.gzip(data,function(err, res){
                    configDic[fullPath] = res;
                    fn(null,res);
                });
            }
        });

    }
}


function clearCache()
{
    configDic = {};
}

exports.clearCache = clearCache;
exports.start = start;
