/**
 * Created by xiayanxin on 2016/4/19.
 *
 * 远程重启服务器api
 *
 * @see http://stackoverflow.com/questions/14458508/node-js-shell-command-execution
 */

var fs = require("fs");
var exec = require('child_process').exec;
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    if (jutil.postCheck(query, "u", "p") == false) {
        echo("postError");
        return;
    }
    var username = query["u"];
    var password = query["p"];

    if (username != "admin" || password != "zhudanni") {
        echo("INVALID");
        return;
    }
    // log it
    fs.appendFile('reboot.log', jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    // send response to client before REBOOT
    echo("server will reboot later");
    // do it
    exec("/bin/sh appctl.sh restart", function (error, stdout, stderr) {
        console.log(error, stdout, stderr);
    });

    function echo(str) {
        response.end(str, "utf-8");
    }
}

exports.start = start;