/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-5-22
 * Time: 下午9:08
 * To change this template use File | Settings | File Templates.
 */
var urlParse = require("url").parse;
var http = require("http");
function nodePostData(url , data ,cb) {
    console.log("begin" + JSON.stringify(data));
    var postData = require("querystring").stringify(data);
    console.log("postData" + postData)
    var urlData = urlParse(url);
    var options = {
        hostname: urlData.hostname,
        port: urlData.port || 80,
        path: urlData.path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        }
    };

    var req = http.request(options, function(res) {
//        console.log('STATUS: ' + res.statusCode);
//        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        var mData = '';
        var sTime = Date.now();
        res.on('data', function (chunk) {
            mData += chunk;
            console.log('BODY: ' + chunk);
        });
        res.on('end', function() {
            var mTime = Date.now() - sTime;
            try {
                var mDataObj = JSON.parse(mData);
                console.log("jichang..........." + mData);
            } catch(err){
                cb("invalidAccount");
                return;
            }
            if(data["action"]) {
                console.log("jichang..........." + data["action"]);
            }
            console.log("time:" + mTime);
            cb(null, mDataObj);
        });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });

// write data to request body
    req.write(postData);
    req.end();
}
exports.nodePostData = nodePostData;