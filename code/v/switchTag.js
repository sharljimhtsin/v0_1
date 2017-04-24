/**
 * Created by xiazhengxin on 2017/4/11.
 */

var fs = require("fs");
var resolve = require("path").resolve;

function start(postData, response, query) {
    var p = query["p"];
    var updateTag = {};
    var echoString;
    var mPath = resolve(__dirname, "../../config/version/updateTag.json");
    var updateTagFile = fs.readFileSync(mPath, "utf-8");
    updateTag = JSON.parse(updateTagFile);
    if (updateTag.hasOwnProperty(p)) {
        echoString = "1";//updateTag[p];
    } else {
        echoString = "0";
    }
    response.end(echoString, "utf-8");
}

exports.start = start;