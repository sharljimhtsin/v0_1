/**
 * hero的数据类型
 * User: liyuluan
 * Date: 13-10-21
 * Time: 上午11:54
 */

function HeroObj(hero,config) {
    this._hero = hero;
    this._config = config;



    this.hp  = 0; //血
    this.attack = 0; //攻
    this.defence = 0; //防
    this.spirit = 0; //内
}

HeroObj.prototype.getHP = function() {

}


