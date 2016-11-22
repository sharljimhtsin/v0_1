/**
 * User: liyuluan
 * Date: 14-5-26
 * Time: 下午3:57
 */

var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var async = require("async");
var modelUtil = require("../model/modelUtil");


function start(postData, response, query) {
    var userUid = query["userUid"];

    var configData = configManager.createConfig(userUid);

    userVariable.getVariable(userUid, "review", function(err, res) {
        if (err) {
            response.echo("practice.review",jutil.errorInfo("dbError"));
        } else if (res == 1) {
            response.echo("practice.review",{"result":0});
        } else {
            var mList = configData.g("appraise")("item")();

            userVariable.setVariable(userUid, "review", 1, function(err) {
                if (err) {
                    response.echo("practice.review",jutil.errorInfo("dbError"));
                } else {
                    var resultList = [];
                    async.forEach(mList, function(item, forCb) {
                        modelUtil.addDropItemToDB(item["id"], item["count"], userUid, true, 1, function(err, res) {
                            resultList.push(res);
                            forCb(null);
                        });
                    }, function(err, res) {

                        var resultObj = {};
                        resultObj["result"] = 1;
                        resultObj["list"] = resultList;
                        response.echo("practice.review",resultObj);
                    });
                }
            });
        }
    });
}


exports.start = start;