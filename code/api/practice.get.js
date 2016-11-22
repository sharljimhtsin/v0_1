/**
 * 取得奇遇列表
 * User: liyuluan
 * Date: 13-11-14
 * Time: 下午3:55
 */
var practice = require("../model/practice");
var jutil = require("../utils/jutil");

/**
 * practice.get 取奇遇的数据列表
 *
 * 返回值
 *  eatBean:{"eatbean12":time,"eatbean18":time}  //12点那次的吃豆时间 和 18点那次的吃豆时间，如果时间是今天表示已吃过，否则表示没吃过
 *  daily:{"completedDay":value,"completeDay":value,"lastTime":time} //已完成次数，总需要完成次数，最后一次完成时间
 *  fund:{"joinFund":value,"fundReward":value}
 *
 *
 * @param postData
 * @param response 
 * @param query
 */
function start(postData, response, query) {
    var userUid = query["userUid"];
    practice.getPracticeList(userUid,function(err,res) {
        if (err) {
            response.echo("practice.get",jutil.errorInfo("dbError"));
        }
        else {
            response.echo("practice.get",res);
        }
    });
}

exports.start = start;