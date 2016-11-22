var ConfigProxy = require("../../alien/config/ConfigProxy");

function mapHandler(config, configUtil){
    this.init(config, configUtil);

    this.iterator = function(key, itemConfig) {
        return this.joinVerify(
            this.verifyExist(itemConfig, "heroId", ["hero"]),
            this.verifyExist(itemConfig, "nextMapId", ["map"], "")
        );
    }
}


ConfigProxy.extend(mapHandler);

module.exports = mapHandler;