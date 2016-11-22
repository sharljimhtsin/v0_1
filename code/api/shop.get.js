/**
 * 取商店列表
 * shop.get
 * User: liyuluan
 * Date: 13-12-23
 * Time: 下午4:30
 */

var shop = require("../model/shop");
var jutil = require("../utils/jutil");
var redis = require("../alien/db/redis");

/**
 * 返回说明
 *      type 类别 1 道具 2 礼包 分类用
 *      buyPrice 购买的价格
 *      originPrice 原价
 *      sTime 开始时间  0  如果不为 0 需要显示倒计时
 *      eTime 结束时间
 *      vip  限制VIP 等级以上可购买
 *      count 最多可购买次数
 *      itemId 要购买的物品ID
 *
 * @param postData
 * @param response
 * @param query
 */

function start(postData, response, query) {
    var userUid = query["userUid"];
    shop.getShopList(userUid, function(err, res) {
        if (err) response.echo("shop.get", jutil.errorInfo("dbError"));
        else {
            var shopList = [];
            res = JSON.parse(res);
            for(var i in res){
                if(res[i]["sTime"] - jutil.now() > 0 || res[i]["eTime"] - jutil.now() <= 0)continue;
                shopList.push(res[i]);
            }
            var resultData = '{"shopList":' + JSON.stringify(shopList) + ",";
            shop.getBuylog(userUid, function(err, res) {
                if (err) response.echo("shop.get", jutil.errorInfo("dbError"));
                else {
                    var resStr = "";
                    try {
                        resStr = JSON.stringify(res);
                    } catch (error) {
                    }
                    resultData += '"buyLog":' + resStr + ',';


                    var nowDate = new Date(jutil.now() * 1000);
                    var buyLogKey = "buyLog"+nowDate.getFullYear()+""+(nowDate.getMonth()+1)+""+nowDate.getDate();
                    redis.user(userUid).s(buyLogKey).getObj(function(err,res) {
                        if (err) response.echo("shop.get", jutil.errorInfo("dbError"));
                        else {
                            var resStrToday = "";
                            try {
                                var listAttr = [];
                                for(var key in res){
                                    listAttr.push(res[key]);
                                }
                                resStrToday = JSON.stringify(listAttr);
                            } catch (error) {
                            }

                            resultData += '"todayBuyLog":' + resStrToday + '}';
                            response.echoString("shop.get", resultData);
                        }
                    });
                }
            });
        }
    });
}

exports.start = start;