/**
 * User: liyuluan
 * Date: 14-1-20
 * Time: 下午3:42
 */
var ConfigProxy = require("../../alien/config/ConfigProxy");

function HeroHandler(config, configUtil){
    this.init(config, configUtil);

    this.setDelKey(["des"]);

}


ConfigProxy.extend(HeroHandler);

module.exports = HeroHandler;