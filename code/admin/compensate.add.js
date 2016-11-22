/**
 * 添加一个补偿
 * compensate.add
 * User: liyuluan
 * Date: 14-3-3
 * Time: 下午12:13
 */
var admin = require("../model/admin");
var jutil = require("../utils/jutil");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["sendGift"], query["country"]) == false) { //添加补偿采用 发送奖励权限
        response.echo("compensate.add", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "text", "reward", "sTime", "eTime", "reg_sTime", "reg_eTime") == false) {
        response.echo("compensate.add", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("compensateM",query,postData);
    try {
        var mReward = JSON.parse(postData["reward"]);
        if (mReward instanceof Array == true) {
            for (var i = 0; i < mReward.length; i++) {
                var mItem = mReward[i];
                if (mItem == null || mItem["id"] == null) {
                    response.echo("compensate.add", jutil.errorInfo("postError"));return;
                }
            }
        } else {
            response.echo("compensate.add", jutil.errorInfo("postError"));return;
        }
    } catch(err) {
        response.echo("compensate.add", jutil.errorInfo("postError"));
        return;
    }
    var mData = {};
    mData["text"] = postData["text"];
    mData["reward"] = postData["reward"];
    mData["sTime"] = postData["sTime"];
    mData["eTime"] = postData["eTime"];
    mData["city"] = postData["city"];
    mData["reg_sTime"] = postData["reg_sTime"];
    mData["reg_eTime"] = postData["reg_eTime"];
    mData["channel"] = postData["channel"];
    var country = query["country"];
    admin.addCompensate(country,mData,function(err, res) {
        if (err) response.echo("compensate.add", jutil.errorInfo("postError"));
        else{
            response.echo("compensate.add", res);
        }
    });
}
exports.start = admin.adminAPIProxy(start);