var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var modelUtil = require("../model/modelUtil");
var stats = require("../model/stats");

function start(postData, response, query) {
    if ( jutil.postCheck(postData,"actionId") == false ) {
        response.echo("user.guide",jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var actionId = postData["actionId"];

    var userIP = response.response.socket.remoteAddress;

    response.echo("user.guide",{"result":1});
    stats.userGuide(userUid, userIP, actionId);
}

exports.start = start;
