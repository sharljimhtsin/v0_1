/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 15-9-21
 * Time: 上午10:55
 * 越南充值调用
 * To change this template use File | Settings | File Templates.
 */
var crypto = require("crypto");
var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");
var Buffer = require('buffer').Buffer;
var user = require("../model/user");
var bitUtil = require("../alien/db/bitUtil");

function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log', "yuenan:" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log("yuenan...POST...." + JSON.stringify(postData));
    console.log("yuenan...GET...." + JSON.stringify(query));
    console.log(postData,"23423423");
    if (jutil.postCheck(postData, "status", "card_vendor", "hash", "target","card_code","amount", "revenue","state","transaction_type", "currency", "sandbox","card_serial","country_code","transaction_id") == false) {//"serverid", "time","gold"
        response.end("fail", "utf-8");
        return;
    }
    var status = postData["status"];//成功为1, 失败为 0.
    var transaction_type = postData["transaction_type"];//用户要用实行交易的支付方式(SMS,Bank..)
//    var serverid = postData["serverid"];//服务器id
//    var time = postData["time"];//玩家进行交易的时间
//    var gold = postData["gold"];//游戏币

    var hash = postData["hash"];//成功交易的Id.
    console.log(hash,"1");
    var amount = postData["amount"];//交易金额.
    var revenue = postData["revenue"];//smg??
    var currency = postData["currency"];//充值币种--VND
    var transaction_id = postData["transaction_id"];//smg??
    var sandbox = postData["sandbox"];
    var card_code = postData["card_code"];
    var card_serial = postData["card_serial"];
    var card_vendor = postData["card_vendor"];
    var country_code = postData["country_code"];//VN
    var target = postData["target"];//透传参数1
    var state = postData["state"];//透传参数2
    var args1 = target.split("|");//username:auduongchanhoa89|userid:17473436'
    var args2 = state.split("#");// useruid # orderMoney # goodsId # orderNo    //55851352391#99.99#7#1dfeca227dc93800757d5002aaaee908#com.apt.4000
    //拼接拆分后的字符串
//    var sTarget = "";
//    var sState = "";
//    for(var a in args1){
//        if(args1[a] != undefined){
//            sTarget += args1[a];
//        }else{
//            console.log("null"+"testtest");
//        }
//    }
//    for(var b in args2){
//        if(args2[b] != undefined){
//            sState += args2[b];
//        }else{
//            console.log("null");
//        }
//    }
    if (status != 1) {
        response.end("fail", "utf-8");
    }
    var appKey = platformConfig["yuenan"]["AppKey"];
    var app_secret = platformConfig["yuenan"]["AppSecret"];//smg??
//    var validateStr ="serverid=" + serverid + "&userid=" + args2[0] + "&key=" + appKey + "&timestamp=" + time;
    var check_hash = "";
    console.log(transaction_type,"type:");
    switch(transaction_type){
        case 'CARD':
            console.log(amount,card_code,card_serial,card_vendor,country_code,currency,revenue,sandbox,state,status,target,transaction_id,transaction_type,app_secret,"3424234");
            check_hash = amount + card_code + card_serial + card_vendor + country_code + currency + revenue + sandbox + state + status + target + transaction_id + transaction_type + app_secret;
            break;
        case 'SMS':
            var phone = 1;
            var message = 1;
            var code = 1;
            check_hash =amount + code + country_code + currency + revenue + message + phone + sandbox + state + status + target + transaction_id + transaction_type + app_secret;
            break;
        case 'APPLE_ITUNES':
            var productid = 1;
            check_hash =amount + country_code + currency + revenue + productid + sandbox + state + status + target + transaction_id + transaction_type + app_secret;
            break;
        case 'GOOGLE_PLAY':
            var productid = 1;
            check_hash =amount + country_code + currency + revenue + productid + sandbox + state + status + target + transaction_id + transaction_type + app_secret;
            break;
        default :
            check_hash =amount + country_code + currency + revenue + sandbox + state + status + target + transaction_id + transaction_type + app_secret;
            break;
    }
    var buf = new Buffer(1024);
    var len = buf.write(check_hash,0);//validateStr
    var result = buf.toString('binary',0,len);
    var md5Sign = crypto.createHash('md5').update(check_hash).digest('hex');

    response.writeHead(200, {'Content-Type': 'text/plain', "charset":"utf-8"});
    console.log(hash,md5Sign,"match...");
    if (hash != md5Sign) {//64441286658  55851352391
        console.log("sign not match");
        response.end(JSON.stringify({"error_code": "5", "error_msg": "sign无效"}), "utf-8");
    } else {
        var userUid = args2[0];
        console.log("userUid:",userUid);
        var xxx = bitUtil.parseUserUid(userUid);
        console.log(xxx);
        user.getUser(userUid,function(err,res){
            if(err||res == undefined)response.end("id不对或者没有这个用户", "utf-8");
            else{
                response.end("Yeah", "utf-8");
            }
        });

//        var time = jutil.now();
//        console.log("sign matched");//userUid, orderNo, platformId, uin, goodsCount, orderMoney, payStatus, createTime, goodsId, callbackFn, ingot, kda, order_id
//        console.log(args2[0], args2[3],  "yuenan", "test",1,args2[1], status, time,args2[2],"634345");
//        order.updateOrder(args2[0], args2[3],  "yuenan", args1[1],1,args2[1], status, time,args2[2], JSON.stringify(postData), function (err, res) {
//            console.log(res,"res");
//            if (res == 1) {
//                console.log("order updated");
//                response.end("ok", "utf-8");
//            } else if(res == 2) {
//                console.log("order repeat");//订单重复
//                response.end("repeat", "utf-8");
//            } else {
//                console.log(res);
//                console.log("order update fail");//订单更新失败
//                response.end("fail", "utf-8");
//            }
//        });

    }

//    if (!verify_appota_transaction(transaction_id, amount, state, target)){
//        // Verify fail
//        return false;
//    }
    // Base on state and other information increase resource for user
//    increase_resource_user(transaction_id, transaction_type, amount, target, state);
//    http_response_code(200);
//    return true;
}
//function verify_appota_transaction(transaction_id, amount, state, target) {
//    var url = sprintf('https://pay.appota.com/payment/confirm?api_key=%s&lang=en', API_KEY);
////        var fields = array('transaction_id' => transaction_id);
//    var result = call_curl_post(url, fields);
//    if (result['status'] == true && result['data']['amount'] == amount && result['data']['state'] == state && result['data']['target'] != null) {
//        return true;
//    }
//    return false;
//}
//
//    function increase_resource_user(transaction_id, transaction_type, amount, target, state){
//    }

//if (transaction_id){
//    response.echo("POST");
//}
exports.start = start;