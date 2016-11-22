/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-5-13
 * Time: 上午11:12
 * To change this template use File | Settings | File Templates.
 */
var http = require("http");
var urlParse = require("url").parse;
var async = require("async");
var jutil = require("../utils/jutil");
var post = require("../model/postData");
function postData(url,data,cb){
//    var urlData = urlParse(url);
    var sd = require("querystring").stringify(data);
    url += "?" + sd;
    var req = http.request(url, function(res) {
        var mStatusCode = res.statusCode;
        res.setEncoding('utf8');
        var mData = '';
        var sTime = Date.now();

        res.on('data', function(chunk) {
            mData += chunk;
        });
        res.on('end', function() {
            var mTime = Date.now() - sTime;
            try {
                console.log("jichang..........." + mData);
                var mDataObj = JSON.parse(mData);
                if(data["action"]) {
                    console.log("jichang..........." + sd);
                }
            } catch(err){
                cb("invalidAccount");
                return;
            }
            if(data["action"]) {
                console.log("jichang..........." + data["action"]);
            }
            //ErrorCode:(0=失败,1=成功(SessionId 有效),2= AppId 无效,3= Act 无效,4=参数无效,5= Sign 无效,11=SessionId 无效)
                cb(null, mDataObj);
        });
    });

    req.on("error", function(err) {
        cb(err);
    });

//    req.write(sd);
    req.end();
}
exports.postData = postData;