/**
 * 游戏动态信息，滚动信息
 * User: liyuluan
 * Date: 13-12-3
 * Time: 下午12:30
 */

var gameModel = require("../model/gameModel");
var jutil = require("../utils/jutil");

/**
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    var userUid = query["userUid"];
    //gameModel.addNews("3","灰袍甘道夫","170101",10);
    gameModel.getNews(userUid, function(err,res) {
        if (err) response.echo("game.news",jutil.errorInfo("dbError"));
        else {
            response.echo("game.news", res);
        }
    });
}

exports.start = start;