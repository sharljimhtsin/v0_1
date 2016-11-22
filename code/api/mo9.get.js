/**
 * 拼接充值参数
 * @constructor
 */
var jutil = require("../utils/jutil");
var platformConfig = require("../../config/platform");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "orderNo", "amount", "userUid") == false) {
        echo(response, "postError");
        return false;
    }
    var orderNo = postData["orderNo"];
    var amount = postData["amount"];
    var item_name = postData["item_name"];
    var userUid = postData["userUid"];
    var return_url = postData["return_url"];
    var host = postData["host"];
    var pay_uri = "https://www.mo9.com/gateway/mobile.shtml?m=mobile";
    var privateKey = platformConfig["mo9"]["privateKey"];
    var payParams = {};
    payParams["pay_to_email"] = platformConfig["mo9"]["pay_to_email"];
    payParams["app_id"] = platformConfig["mo9"]["app_id"];
    payParams["version"] = "2.1";
    payParams["notify_url"] = host + platformConfig["mo9"]["notify_url"];
    payParams["invoice"] = orderNo;
    payParams["payer_id"] = userUid;
    payParams["lc"] = "CN";
    payParams["amount"] = amount;
    payParams["currency"] = "CNY";
    payParams["item_name"] = item_name;
    if (return_url && return_url != "") {
        payParams["return_url"] = return_url;
    }
    // 计算签名
    var keys = Object.keys(payParams);
    keys.sort();
    var strToSign = "";
    for (var pkey in keys) {
        if (strToSign == "") {
            strToSign += (keys[pkey] + "=" + payParams[keys[pkey]]);
        } else {
            strToSign += ("&" + keys[pkey] + "=" + payParams[keys[pkey]]);
        }
    }
    strToSign += privateKey;
    var sign = md5_chs(strToSign).toUpperCase();
    payParams["sign"] = sign;
    // 拼接URL参数
    keys = Object.keys(payParams);
    keys.sort();
    for (var pKey in keys) {
        pay_uri += ("&" + keys[pKey] + "=" + encodeURIComponent(payParams[keys[pKey]]));
    }
    echo(response, null, pay_uri);
}

function echo(response, err, res) {
    if (err) {
        response.echo("mo9.get", jutil.errorInfo(err));
    } else {
        response.echo("mo9.get", res);
    }
}

function test(orderNo, amount, ymjbnum, userUid) {
    var pay_uri = "https://www.mo9.com/gateway/mobile.shtml?m=mobile&";
    var payParams = {};
    payParams["pay_to_email"] = "jiangzhuoxi@gametrees.com";
    payParams["app_id"] = "1024zNwZVLmDlY";
    payParams["version"] = "2.1";
    payParams["notify_url"] = "http://localhost/serverDemo/notifyHandler.jsp";
    payParams["invoice"] = orderNo;//订单号
    payParams["payer_id"] = userUid;
    payParams["lc"] = "CN";
    payParams["amount"] = amount;
    payParams["currency"] = "CNY";
    payParams["item_name"] = ymjbnum + "yb";
    var privateKey = "864d2b83fdde4339940dac7eb76641c9";
}

function md5_chs(data) {
    var Buffer = require("buffer").Buffer;
    var buf = new Buffer(data);
    var str = buf.toString("binary");
    var crypto = require("crypto");
    return crypto.createHash("md5").update(str).digest("hex");
}
exports.start = start;