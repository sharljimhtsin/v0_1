/**
 *
 * User: liyuluan
 * Date: 14-5-26
 * Time: 下午3:10
 */

var dgram = require('dgram');

function KingnetUDP(port, address, resourceNum) {
    this.port = port;
    this.address = address;
    this.udp = dgram.createSocket('udp4');
    this.resourceNum = resourceNum || 1146028;
}

KingnetUDP.prototype.send = function (userUid, str, type) {
    str = str + "\0";
    var logBuf = new Buffer(str);
    var bufLength = logBuf.length + 30 + 1 + 6 + 2;
    var offset = 0;

    var buf = new Buffer(bufLength);
    buf.writeUInt8(0, 0);
    offset += 1;
    buf.writeInt32BE(bufLength - 1, offset);
    offset += 4;//packageLength
    buf.writeFloatBE(userUid - 0, offset);
    offset += 4;
    buf.writeInt16BE(0, offset);
    offset += 2;
    buf.writeInt16BE(0, offset);
    offset += 2;
//   NULL
    buf.writeInt16BE(30, offset);
    offset += 2; //headerLen长度
    buf.writeInt16BE(0x10, offset);
    offset += 2;
    buf.writeInt16BE(0x03, offset);
    offset += 2;
    buf.writeInt16BE(0x03, offset);
    offset += 2;
    buf.writeInt16BE(0, offset);
    offset += 2;
    buf.writeInt32BE(this.resourceNum, offset);
    offset += 4;
    buf.writeInt32BE(Math.floor(Date.now() / 1000), offset);
    offset += 4;

    ////////body
    buf.writeFloatBE(userUid - 0, offset);
    offset += 4;
    buf.writeInt16BE(type, offset);
    offset += 2;
    buf.writeInt16BE(logBuf.length, offset);
    offset += 2;
    buf.write(str, offset);

    this.udp.send(buf, 0, buf.length, this.port, this.address, function (err) {
        if (err) {
            console.log(err, "udp");
        } else {
            console.log("ok", "udp");
        }
    });
};