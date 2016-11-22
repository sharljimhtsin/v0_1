/**
 * User: joseppe
 * Date: 14-7-22
 * Time: 下午4:16
 */

var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");

function start(postData, response, query, authorize) {
    if (jutil.postCheck(postData, "logModel") == false) {
        response.echo("analytic.search", jutil.errorInfo("postError"));
        return;
    }
    var startTime = postData["startTime"];
    var endTime = postData["endTime"];
    var logModel = postData["logModel"];
    var userUid = postData["userUid"];
    var itemId = postData["itemId"];
    var typeId = postData["typeId"];

    var configData = configManager.createConfigFromCountry(query["country"]);
    admin.analyticSearch(userUid, logModel, startTime, endTime, typeId, itemId, function(err,res){
        if(err){
            response.echo("analytic.search", jutil.errorInfo(err));
        }else{
            var resList = [];
            for(var i in res){
                var action = [];
                var str = JSON.stringify(res[i]);
                var json = JSON.parse(str);
                for(var k in  json){
                    if(k != 'userUid' && k != 'time' && k != 'typeId' && k != '_id' && k != '__v'){
                        action.push(k+":"+json[k]);
                    }
                    if(k == 'itemId'){
                        var itemName = '';
                        var itemConfig = {};
                        switch (json[k].substr(0, 2)) {
                            case "10"://hero 魂魄
                                itemConfig = configData.getConfig("hero");
                                break;
                            case "11":
                                itemConfig = configData.getConfig("skill");
                                break;
                            case "12"://装备
                            case "13"://装备
                            case "14"://装备
                                itemConfig = configData.getConfig("equip");
                                break;
                            case "15"://item
                                itemConfig = configData.getConfig("item");
                            default:
                                itemName = json[k];
                        }
                        if(itemConfig.hasOwnProperty(json[k]))
                            itemName = itemConfig[json[k]]['name'];
                        action.push('itme:'+itemName);
                    }
                }
                json['action'] = action.join("|");
                json['time'] = Math.floor(json['time']/1000);
                resList.push(json);
            }
            response.echo("analytic.search", resList);
        }
    });
}


exports.start = admin.adminAPIProxy(start);
