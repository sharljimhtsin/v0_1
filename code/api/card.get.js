/**
 * 获取card列表和真元数量
 * User: liyuluan
 * Date: 13-11-25
 * Time: 下午5:07
 */

var card = require("../model/card");
//var userVariable = require("../model/userVariable")
var itemModel = require("../model/item");
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var userUid = query["userUid"];

    card.getCardList(userUid, function(err,res) {
        if (err) response.echo("card.get",jutil.errorInfo("dbError"));
        else {
            var cardList = res;
            itemModel.getItem(userUid,"151601",function(err,res) {
                if (err) response.echo("card.get", jutil.errorInfo("dbError"));
                else {
                    var mNum = (res == null) ?0:res["number"];
                    response.echo("card.get", {"cardList":cardList,"sex":mNum});
                }
            });
        }
    });


}

exports.start = start;