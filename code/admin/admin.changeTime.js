/**
 * User: liyuluan
 * Date: 14-3-26
 * Time: 下午3:51
 */

var admin = require("../model/admin");
var jutil = require("../utils/jutil");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["serverModify"], query["country"]) == false) {
        response.echo("admin.changeTime", admin.AUTH_ERROR);
        return;
    }
    var testList = ["dbztest.gt.com", "test-df.gameforest.in.th", "detest.opogame.com", "183.129.161.38", "127.0.0.1"];

    if(testList.indexOf(response.host) == -1 && response.host.indexOf("172.24.") == -1){
        response.echo("admin.changeTime", jutil.errorInfo("postError"));
        return;
    }

    if (jutil.postCheck(postData, "offsetTime") == false) {
        response.echo("admin.changeTime", jutil.errorInfo("postError"));
        return;
    }

    var mOffsetTime = postData["offsetTime"] - 0;
    mOffsetTime = mOffsetTime * 1000 * 60
    if(postData["offsetTime"] == -1){
        var nowTime = postData["nowTime"];
        var nowdate = new Date();
        var newdate = new Date(nowTime);
        mOffsetTime = newdate.getTime() - nowdate.getTime();
    }
    admin.addOneOperationLog("system",query,postData);
    var nowValue = jutil.setTimeOffset(mOffsetTime);
    response.echo("admin.changeTime", {"result":nowValue});
}


exports.start = admin.adminAPIProxy(start);
