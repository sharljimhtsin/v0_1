/**
 * 请求服务器列表
 * User: liyuluan
 * Date: 14-1-28
 * Time: 下午5:51
 */
var admin = require("../model/admin");
var mysql = require("../alien/db/mysql");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["login"], query["country"]) == false) {
        response.echo("server.list", admin.AUTH_ERROR);
        return;
    }

    var uid = query["uid"];
    var country = query["country"];
    try {
        var serverList = require("../../config/" + country + "_server.json")["serverList"];
    } catch(err) {
        response.echo("server.list", []);
        return;
    }

    var mList = [];
    for (var key in serverList) {
        var obj = {};
        obj["id"] = serverList[key]["id"];
        obj["openTime"] = serverList[key]["sTime"] == undefined?0:serverList[key]["sTime"];
        obj["name"] = serverList[key]["name"];
        obj["isClosed"] = 0;
        mList.push(obj);
    } //后面需要加入数据库中的开启列表
    mysql.loginDB(country).query("SELECT * FROM serverlist", function(err, res) {
        if (err) {
            response.echo("server.list", mList);
        } else {
            for (var i in res) {
                for(var j in mList){
                    if(mList[j]["id"] == res[i]["serverId"]){
                        mList[j]["openTime"] = res[i]["openTime"];
                        mList[j]["isClosed"] = res[i]["isClosed"];
                    }
                }
            }
            response.echo("server.list", mList);
        }
    });
}

exports.start = admin.adminAPIProxy(start);