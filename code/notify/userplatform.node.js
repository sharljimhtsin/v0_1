/**
 * Created by apple on 14-6-1.
 */
var mysql = require("../alien/db/mysql");
var parseUserUid = require("../alien/db/bitUtil").parseUserUid;
//var jutil = require("../utils/jutil");


function start(postData, response, query) {
    var userUid = query["userUid"];
    if (userUid == null) {
        response.end("ERROR");
        return;
    }

    var cc = parseUserUid(userUid);
    if (cc[0] != "e") {
        response.end("ERROR");
        return;
    }

    mysql.game(userUid).query("SELECT `userUid`,`userName`,`exp`, `ingot`, `vip`, `pUserId` FROM user WHERE userUid=" + mysql.escape(userUid), function(err, res) {
       if (err) {
           response.end("处理错误");
       } else if (res == null || res.length == 0) {
           response.end("没有这个ID");
       } else {
           response.end(JSON.stringify(res[0]));
       }
    });

}

exports.start = start;