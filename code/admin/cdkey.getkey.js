/**
 * cdkey.getkey
 * User: liyuluan
 * Date: 14-2-10
 * Time: 下午9:51
 */


var admin = require("../model/admin");
var cdkey = require("../model/cdkey");
var jutil = require("../utils/jutil");
var fs = require("fs");


function start(postData, response, query, authorize) {

    if (jutil.postCheck(postData,  "giftID") == false) {
        response.echo("cdkey.getkey", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("cd-key",query,postData);
    var country = query["country"];
    var giftID = postData["giftID"];
    var action = (postData["action"]==undefined)? "get":postData["action"];

    switch (action){
        case "get":
            cdkey.getKeys(country, giftID, function(err, res) {
                if (err || res == null) response.echo("cdkey.getkey", jutil.errorInfo("dbError"));
                else {
                    response.echo("cdkey.getkey", res);
                }
            });
            break;
        case "down":
            if (jutil.postCheck(postData, "time") == false) {
                response.echo("cdkey.getkey", jutil.errorInfo("postError"));
                return;
            }

            var time = postData["time"];
            cdkey.getKeysByTime(country, giftID, time, function(err, res) {
                if (err || res == null) response.echo("cdkey.getkey", jutil.errorInfo("dbError"));
                else {
                    var keys = [];
                    for(var i in res){
                        keys.push(res[i]["key"]);
                    }

                    var path = __dirname.replace("admin","");
                    var cdkeyDirPath = path + "html/down/";
                    if (!fs.existsSync(cdkeyDirPath)) fs.mkdirSync(cdkeyDirPath);
                    cdkeyDirPath += "cdkey/"
                    if (!fs.existsSync(cdkeyDirPath)) fs.mkdirSync(cdkeyDirPath);

                    var filename = giftID+"_"+time+".txt";
                    fs.writeFileSync(cdkeyDirPath+filename, JSON.stringify(keys));

                    response.echo("cdkey.getkey", filename);
                }
            });
            break;
        default :
            response.echo("cdkey.getkey", jutil.errorInfo("postError"));
            return;
    }

}

exports.start = admin.adminAPIProxy(start);