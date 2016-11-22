

var mongo = require("../code/alien/db/mongo");
var async = require("async");
var fs = require("fs");

var ItemGetSchema = new mongo.Schema(
{
    itemId:String,
    userUid:Number,
    count:Number,
    typeId:Number,
    time:Number
});
var IngotExpendSchema = new mongo.Schema(
{
    userUid:Number,
    ingot:Number, //元宝数
    typeId:String, //消耗类别
    time:{type:Number, default:Date.now}
});
var GoldGetSchema = new mongo.Schema(
{
    userUid:Number,
    count:Number, //消耗数量
    typeId:Number, //用途
    other:String, //其它数据
    time:{type:Number, default:Date.now}
});


var startTime = 1410840000000;
var endTime = 1411099200000;
var searchTimes = [];
for(var i = startTime; i < endTime; i += 86400000){
    searchTimes.push({startTime:i, endTime:i+86400000});
}
var where = {};//{"typeId":0,"time":{"$gt":1409241600000,"$lt":1409328000000}};
var itemIds = ["151872", "151873", "151874", "151875", "151876", "151877"];
var counts = [50000, 100000, 200000, 500000, 1000000, 2000000, 5000000];
var typeIds = [10, 11];
var countryList = ['c', 'd', 'f'];
var csv = "q,f,userUid,ingot";

//csv += itemIds.join(',');
csv += "\n";
async.forEachSeries(countryList, function(country, forCba) {
    console.log(country, 'start');
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for(var city in serverList){
        cityList.push(city);
    }
    async.forEachSeries(cityList, function(city, forCbb) {
        console.log(country, city, 'start');
        where["time"] = {"$gt":startTime,"$lt":endTime};
        var users = {};
        //async.forEachSeries(itemIds, function(itemId, forCbc) {
        //    where['itemId'] = itemId;
            mongo.getDBFromCountry(country, city).model('IngotExpend', IngotExpendSchema).find(where, function (err, res) {
                for(var i in res){
                    if(users[res[i].userUid] == undefined)
                        users[res[i].userUid] = 0;
                    //if(users[res[i].userUid][itemId] == undefined)
                    //    users[res[i].userUid][itemId] = 0;
                    users[res[i].userUid] += res[i].ingot;
                }
                console.log(country, city, 'end');
                for(var userUid in users){
                    var rowArr = [];
                    rowArr.push(country);
                    rowArr.push(city);
                    rowArr.push(userUid);
                    /*
                    for(var i in itemIds){
                        if(users[userUid][itemIds[i]] == undefined)
                            users[userUid][itemIds[i]] = 0;
                        rowArr.push(users[userUid][itemIds[i]]);
                    }
                    */
                    rowArr.push(users[userUid]);
                    csv += rowArr.join(",");
                    csv += "\n";
                }
                mongo.getDBFromCountry(country, city).close(forCbb);
                //forCbc(null);
            });
        //},function(err){
        //});
    }, function(err){
        console.log(country, 'end');
        forCba(null);
    });
}, function(err){
    console.log('write file start');
    fs.writeFileSync("mongoExport.csv",csv);
    console.log('write file end');
});



