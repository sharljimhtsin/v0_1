var http = require("http");
var urlParse = require("url").parse;
var crypto = require("crypto");
var jutil = require("../utils/jutil");
var platformConfig = require("../../config/platform");


function check(platformUserId, info, callbackFn) {
    if (info == null || info["sid"] == undefined) {
        callbackFn("invalidAccount", 0);
        console.log("ppzs_login", "invalidAccount");
        return;
    }

    var appId = platformConfig["ppzs"]["appId"];
    var appKey = platformConfig["ppzs"]["appKey"];
    var sid = info["sid"];

    var url = "http://passport_i.25pp.com:8080/account?tunnel-command=2852126760";
    var urlData = urlParse(url);

    var sign = crypto.createHash('md5').update("sid="+sid+appKey).digest('hex');
    var postData = {"id":jutil.now(),"service":"account.verifySession","game":{"gameId":appId},"data":{"sid":sid},"encrypt":"MD5","sign":sign};
    postData = JSON.stringify(postData);


    var options = {
        hostname:urlData.hostname,
        port:urlData.port || 80,
        path:urlData.path,
        method:"POST",
        headers: {
            "Content-Type": 'application/x-www-form-urlencoded',
            "Content-Length": postData.length
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');

        var mData = '';
        res.on('data', function(chunk) {
            mData += chunk;
        });
        res.on('end', function() {
            try {
                var mDataObj = JSON.parse(mData);
            } catch(err){
                callbackFn("invalidAccount");
                return;
            }

            console.log("ppzs_login", mDataObj);
            if (mDataObj &&  mDataObj["state"]["code"]==1) {
                var resultData = {};
                resultData["platformUserId"] = mDataObj["data"]["accountId"];

                console.log("ppzs_login", resultData);

                callbackFn(null, resultData);
            }
            else
                callbackFn("invalidAccount");
        });
    });

    req.on("error", function(err) {
        callbackFn(err);
    });

    req.write(postData + "\n");
    req.end();
}

exports.check = check;