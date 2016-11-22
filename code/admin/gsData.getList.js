/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-4-14
 * Time: 下午3:21
 * To change this template use File | Settings | File Templates.
 */
var admin = require("../model/admin");
var jutil = require("../utils/jutil.js");
var gsData = require("../model/gsData");
var async = require("async");
function start(postData, response, query, authorize) {
//    if (admin.checkAuth(authorize, ["login"], query["country"]) == false) {
//        response.echo("gsData.getList", admin.AUTH_ERROR);
//        return;
//    }

    gsData.getGSDataList(query["country"], postData["name"], function(err,res){
        if(err != null){
            response.echo("gsData.getList", jutil.errorInfo(err));
        }else{

            for(var i in res){
                res[i]["issueId"] = formatDate(new Date(res[i]["issueId"]*1000));
                if(res[i]["status"]==1) res[i]["status"]="进行中";
                else if(res[i]["status"]==2) res[i]["status"]="已结束";
            }

            response.echo("gsData.getList", res);
        }
    });
}
function formatDate(now) {
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var date = now.getDate();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    return   year + "-" + month + "-" + date + " " + hour + ":" + minute + ":" + second;
}

exports.start = start;