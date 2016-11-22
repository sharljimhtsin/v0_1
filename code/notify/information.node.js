var login = require("../model/login");
var jutil = require("../utils/jutil");
var stats = require("../model/stats");
var platformConfig = require("../../config/platform");

function start(postData, response, query) {
    var gid = query["gid"] || 1;
    var aid = query["aid"] || 1; //平台ID

    var serverP = '';
    for(var platformId in platformConfig){
        if(stats.getPlatformIdCode(platformId) == aid){
            serverP = platformConfig[platformId]["country"];
            break;
        }
    }

    if(serverP == ""){
        response.end(JSON.stringify({"ret":0, "server":[]}), "utf-8");
        return;
    }

    login.getServerList(serverP, 0, function(err, res) {
        var mServerData = [];
        for(var i in res){
            mServerData.push({"agentid":aid,"serid":res[i]["id"],"sername":res[i]["id"]+'-'+jutil.fromBase64(res[i]["name"]),"sertime":res[i]["openTime"],"status":"1"});
        }
        response.end(JSON.stringify({"ret":0, "server":mServerData}), "utf-8");
    });
}

exports.start = start;
