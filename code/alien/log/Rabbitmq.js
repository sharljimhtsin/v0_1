/**
 * rabbitmq 封装类
 * User: liyuluan
 * Date: 14-2-16
 * Time: 下午6:24
 */
var amqp = require('amqp');
var fs = require('fs');

function rabbitmq() {
    this._connection = null;

    this._connConfig = null;
    this._optionConfig = null;
    this._exchange_name = null;
    this._routing_key_name = null;
    this._queue_name = "";

    this._exchange = null; //发送消息对象
    this._createReady = false;//是否创建完成
    this._sendReady = false; //是否可以发消息了
    this._buffceList = []; // 在未准备完成时进行的数据缓冲
}

rabbitmq.prototype.createConnection = function(connConfig, option, exchange_name, routing_key_name, queue_name) {
    this._connection = amqp.createConnection(connConfig);
    this._optionConfig = option;
    this._exchange_name = exchange_name;
    this._routing_key_name = routing_key_name;
    this._queue_name = queue_name;
    this._createReady = true;


    var mThis = this;

    this._connection.on('ready', function () {
        var exch = mThis._connection.exchange(mThis._exchange_name, mThis._optionConfig, function(exchange) {
            var mQueue = mThis._connection.queue(mThis._queue_name, mThis._optionConfig, function (queue) {
                mQueue.bind(mThis._exchange_name, mThis._routing_key_name);
            });
            mQueue.on("queueBindOk", function() {
                mThis._exchange = exchange;
                mThis._sendReady = true;
                mThis.publishBuffce();
            });
        });
    });

    // add this for better debuging
    this._connection.on('error', function (e) {
        fs.appendFile('rabbitMQ.log', e + "\n", 'utf8');
        console.error("Error from amqp: ", e);
    });
}





rabbitmq.prototype.publishBuffce = function() {
    if (this._buffceList.length == 0) return;

    while(this._buffceList.length > 0) {
        this._publish(this._buffceList.shift());
    }
}


rabbitmq.prototype._publish = function(str) {
//    console.log(str);
    this._exchange.publish(this._routing_key_name, new Buffer(str), "", function() {
    } );
}

rabbitmq.prototype.publish = function(publishData) {
//    console.log(publishData,666);
    if (this._createReady == false) return;
    var str = null;
    if (publishData instanceof Array) {
        str = publishData.join("|");
    } else {
        str = publishData;
    }
//    console.log(str,1);
    if (this._sendReady == true) {
//        console.log(str,2);
        this._publish(str);
    } else {
        this._buffceList.push(str);
        if (this._buffceList.length > 20000) {
//            this._buffceList.slice(-10000);
            this._buffceList.splice(0, 10000);
        }
    }
}


module.exports = rabbitmq;