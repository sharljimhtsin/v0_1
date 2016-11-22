/**
 * Created by apple on 14-2-10.
 */
var jutil = require("../utils/jutil");
var order = require("../model/order");
var async = require("async");
var configManager = require("../config/configManager");
var variable = require("../model/userVariable");
var platformConfig = require("../../config/platform.json");
var mysql = require("../alien/db/mysql");

//请求地址
//  http://183.129.161.38:8900/notify/knorderno.node
//
//POST 参数
//  productId 商品id
//  kid  用户id
//  city 分区
//
//返回值{"ret": CODE, "msg|orderNo":"xxx"}
//  CODE == -1, 表示错误 ， msg 为错误提示
//  CODE == 1  orderNo 为订单ID


function start(postData, response, query) {
//    postData = query;

    response.end("此接口已无效！", "utf-8");
    return ;

    if (jutil.postCheck(postData,"productId", "kid", "city") == false) {
        response.end(JSON.stringify({"ret" : -1 , "msg" : "參數錯誤"}), "utf-8");
        return;
    }

    var orderNo = jutil.guid();

    var productId = postData["productId"];
    var kid = postData["kid"];
    var platform = postData["platform"] || "ios";//ios:appStore android:非appStore
    var city = postData["city"];

    var userUid = null;

    var configData = configManager.createConfig(userUid);
    var returnData;

    async.series([
        function(cb) {
            var country = platformConfig["kingnet"]["country"];
            var db = mysql.game(null, country, city);
            if (db.isNull == true) {
                cb("分区不存在！");
            } else {
                db.query("SELECT userUid FROM user WHERE platformId='kingnet' AND pUserId=" + mysql.escape(kid), function(err, res) {
                    if (err || res == null || res.length == 0) {
                        cb("数据获取错误");
                    } else {
                        userUid = res[0]["userUid"];
                        cb(null);
                    }
                });
            }
        },
        function(cb) {//addOrder
            order.addOrder(orderNo, userUid,productId, function(err, res) {
                if (err)
                    cb("数据获取错误");
                else {
                    returnData = res;
                    cb(null);
                }
            });
        }
    ], function(err) {
        if (err) {
            response.end(JSON.stringify({"ret" : -1 , "msg" :err}), "utf-8");
        } else {
            response.end(JSON.stringify({"ret" : 1 , "orderNo" :returnData["orderNo"]}), "utf-8");
        }
    });
}

exports.start = start;