/**
 * 请求服务器列表
 * User: liyuluan
 * Date: 14-1-28
 * Time: 下午5:51
 */
var admin = require("../model/admin");
var mysql = require("../alien/db/mysql");
var jutil = require("../utils/jutil");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["serverModify"], query["country"]) == false) {
        response.echo("serverlist.update", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "serverId","isClosed") == false) {
        response.echo("serverlist.update", jutil.errorInfo("postError"));
        return;
    }

    admin.addOneOperationLog("announcement",query,postData);

    var serverId = postData["serverId"];
    var isClosed = postData["isClosed"];
    var uid = query["uid"];
    var country = query["country"];
    try {
        var serverList = require("../../config/" + country + "_server.json")["serverList"];
    } catch(err) {
        response.echo("serverlist.update", []);
        return;
    }

    var mList = [];
    for (var key in serverList) {
        var obj = {};
        obj["id"] = serverList[key]["id"];
        obj["openTime"] = serverList[key]["sTime"] == undefined?0:serverList[key]["sTime"];
        obj["name"] = serverList[key]["name"];
        obj["isClosed"] = 0;
        obj["indb"] = 0;
        mList.push(obj);
    } //后面需要加入数据库中的开启列表

    mysql.loginDB(country).query("SELECT * FROM serverlist", function(err, res) {
        if (err) {
            response.echo("serverlist.update", mList);
        } else {
            for (var i in res) {
                for(var j in mList){
                    if(mList[j]["id"] == res[i]["serverId"]){
                        mList[j]["openTime"] = res[i]["openTime"];
                        mList[j]["isClosed"] = res[i]["isClosed"];
                        mList[j]["indb"] = 1;
                    }
                }
            }
            for(var j in mList){
                if(mList[j]["id"] == serverId){
                    var openTime = postData["openTime"] == undefined?mList[j]["openTime"]:postData["openTime"];
                    var newData = {"serverId":serverId,"openTime":openTime,"isClosed":isClosed};
                    if(mList[j]["indb"] == 1){
                        var sql = "UPDATE serverlist set ? WHERE serverId=" + mysql.escape(serverId);
                    } else {
                        var sql = "INSERT INTO serverlist set ?";
                    }
                    mList[j]["openTime"] = openTime;
                    mList[j]["isClosed"] = isClosed;
                }
            }

            mysql.loginDB(country).query(sql,newData,function(err, res){
                response.echo("serverlist.update", mList);
            })
        }
    });
}

exports.start = admin.adminAPIProxy(start);