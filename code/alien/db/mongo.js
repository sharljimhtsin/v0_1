/**
 * mongodb数据接口
 * User: liyuluan
 * Date: 14-3-25
 * Time: 下午3:54
 */

var bitUtil = require("./bitUtil");
var mongoose = require("mongoose");

var gameConfigPath = "../../../config/";


var dbCache = {};
var modelCache = {};




/**
 * 通过userUid取一个mongodb实例
 * @param userUid
 * @returns {*}
 */
function game(userUid) {
    var mCode;
    mCode = bitUtil.parseUserUid(userUid);
    return getDBFromCountry(mCode[0], mCode[1]);
}


/**
 * 通过country city 取一个mongodb实例
 * @param country
 * @param city
 * @returns {*}
 */
function getDBFromCountry(country, city) {
    return null;
    var mKey = country + city;

    if (dbCache[mKey] != null) { //有缓存时候
        return dbCache[mKey];
    }

    try {
        var cityConfig = require(gameConfigPath + country + "_server.json")["serverList"][city];
    } catch (err) {
        return null;
    }

    var dbPath = cityConfig["mongodb"];
    if (dbPath == null) return null;
    var db = mongoose.createConnection(dbPath);
    dbCache[mKey] = db; //缓存
    return db;
}

//取MODEL
function getModelFromCountry(country, city, modelName, schema) {
    var mCountry = country;
    var mCity = city;

    var mKey = mCountry + mCity + ":" + modelName;
    if (modelCache[mKey] != null) {
        return modelCache[mKey];
    }

    var db = getDBFromCountry(mCountry, mCity);
    if (db == null) {
        return {"create":function() {}, "nulldb":true};
    }

    var mModel = db.model(modelName, schema);
    modelCache[mKey] = mModel;
    return mModel;
}

//取MODEL
function getModel(userUid, modelName, schema ) {
    var mCode = bitUtil.parseUserUid(userUid);
    var mCountry = mCode[0];
    var mCity = mCode[1];
    return getModelFromCountry(mCountry, mCity, modelName, schema);
}


exports.game = game;
exports.getDBFromCountry = getDBFromCountry;
exports.getModelFromCountry = getModelFromCountry;
exports.getModel = getModel;

exports.Schema = mongoose.Schema;