/**
 * 返回当前抽卡（练气）所在的位置和CD时间
 * User: liyuluan
 * Date: 13-11-22
 * Time: 下午4:03
 */
var userVariable = require("../model/userVariable");
var jutil = require("../utils/jutil");

/**
 * 参数
 *   null
 * 返回
 *      {"value":所在位置,"time":可以免费抽的时间}
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    var userUid = query["userUid"];
    userVariable.getVariableTime(userUid, "cardRollPos", function(err,res) {
        if (err) response.echo("card.rollPosition",jutil.errorInfo("dbError"));
        else {
            if (res == null)  response.echo("card.rollPosition",{"value":1,"time":0});
            else {
                response.echo("card.rollPosition",res);
            }
        }
    });

}

exports.start = start;