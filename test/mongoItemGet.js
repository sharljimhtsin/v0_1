

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



var where = {"itemId":"0","typeId":14,"time":{"$gt":1409241600000,"$lt":1409328000000}};
var itemIds = ["150401", "150503", "150603", "133001", "123001", "113002", "144003"];
var countryList = ['g'];
var csv = "q,f,";
csv += itemIds.join(',');
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
        var rowArr = [];
        rowArr.push(country);
        rowArr.push(city);
        async.forEachSeries(itemIds, function(itemId, forCbbc) {
            where["itemId"] = itemId;
            mongo.getDBFromCountry(country, city).model('ItemGet', ItemGetSchema).distinct("userUid", where, function (err, res) {
                rowArr.push(res.length);
                forCbbc(null);
            });
        }, function(err){
            console.log(country, city, 'end');
            csv += rowArr.join(",");
            csv += "\n";
            mongo.getDBFromCountry(country, city).close();
            forCbb(null);
        });
    }, function(err){
        console.log(country, 'end');
        forCba(null);
    });
}, function(err){
    console.log('write file start');
    fs.writeFileSync("itemget.csv",csv);
    console.log('write file end');
});



