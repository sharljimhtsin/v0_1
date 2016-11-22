/**
 * User: liyuluan
 * Date: 14-2-10
 * Time: 上午11:58
 */

var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var order = require("../model/order");
var Buffer = require('buffer').Buffer;

function start(postData, response, query) {
    console.log(JSON.stringify(query));
    console.log("地址：：：", response.socket.remoteAddress);
    var appId = query["AppId"];
    var act = query["Act"];
    var productName = query["ProductName"];
    var consumeStreamId = query["ConsumeStreamId"];
    var orderSerial = query["CooOrderSerial"];
    var uin = query["Uin"];
    var goodsId = query["GoodsId"];
    var goodsInfo = query["GoodsInfo"];
    var goodsCount = query["GoodsCount"];
    var originalMoney = query["OriginalMoney"];
    var orderMoney = query["OrderMoney"];
    var note = query["Note"];
    var payStatus = query["PayStatus"];
    var createTime = query["CreateTime"];
    var appKey = platformConfig["p91"]["appKey"];
    var sign = query["Sign"];
    var validateStr = appId + act + productName + consumeStreamId + orderSerial + uin + goodsId + goodsInfo + goodsCount + originalMoney + orderMoney + note + payStatus + createTime + appKey;

    var buf = new Buffer(1024);
    var len = buf.write(validateStr,0);
    var result = buf.toString('binary',0,len);
    var generateSign = crypto.createHash('md5').update(result).digest('hex');
    response.writeHead(200, {'Content-Type': 'text/plain', "charset":"utf-8"});
    if (sign != generateSign) {
        response.end(JSON.stringify({"ErrorCode":"5","ErrorDesc":"sign无效"}), "utf-8");
    } else {
        order.updateOrder(note, orderSerial,"p91",uin,goodsCount,orderMoney,payStatus,createTime,goodsId, JSON.stringify(query), function(err, res) {
            if (res == 1)
                response.end(JSON.stringify({"ErrorCode":"1","ErrorDesc":"接受成功"}), "utf-8");
            else
                response.end(JSON.stringify({"ErrorCode":"0","ErrorDesc":"接受失败"}), "utf-8");
        })
    }
}



exports.start = start;
