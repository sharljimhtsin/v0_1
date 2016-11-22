-- phpMyAdmin SQL Dump
-- version 4.0.5
-- http://www.phpmyadmin.net
--
-- 主机: 192.168.0.87
-- 生成日期: 2014 年 03 月 12 日 08:00
-- 服务器版本: 5.5.34-log
-- PHP 版本: 5.5.3

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- 数据库: `dragongame_2`
--

-- --------------------------------------------------------

--
-- 表的结构 `activityConfig`
--

CREATE TABLE IF NOT EXISTS `activityConfig` (
  `id` int(11) NOT NULL,
  `sTime` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '开始时间',
  `eTime` int(10) unsigned NOT NULL DEFAULT '1959177600' COMMENT '结束时间',
  `name` varchar(20) NOT NULL COMMENT '配置名字',
  `config` varchar(2000) NOT NULL DEFAULT '' COMMENT '配置文件',
  PRIMARY KEY (`id`),
  KEY `time` (`sTime`,`eTime`,`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='游戏活动配置表';

-- --------------------------------------------------------

--
-- 表的结构 `backpack`
--

CREATE TABLE IF NOT EXISTS `backpack` (
  `userUid` bigint(20) unsigned NOT NULL,
  `backpackUid` bigint(20) unsigned NOT NULL,
  `props` int(10) unsigned NOT NULL COMMENT '背包是什么物品',
  `count` int(10) unsigned NOT NULL,
  PRIMARY KEY (`backpackUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='背包数据表';

-- --------------------------------------------------------

--
-- 表的结构 `box`
--

CREATE TABLE IF NOT EXISTS `box` (
  `userUid` bigint(20) unsigned NOT NULL,
  `point` mediumint(9) NOT NULL DEFAULT '0' COMMENT '拥有的开宝箱积分',
  `b150301` smallint(6) NOT NULL DEFAULT '0' COMMENT '购买次数',
  `b150302` smallint(6) NOT NULL DEFAULT '0',
  `b150401` smallint(6) NOT NULL DEFAULT '0',
  `b150402` smallint(6) NOT NULL DEFAULT '0',
  `b150403` smallint(6) NOT NULL DEFAULT '0',
  `b150404` smallint(6) NOT NULL DEFAULT '0',
  PRIMARY KEY (`userUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='宝箱表';

-- --------------------------------------------------------

--
-- 表的结构 `budokai`
--

CREATE TABLE IF NOT EXISTS `budokai` (
  `userUid` bigint(20) unsigned NOT NULL COMMENT '用户唯一Id',
  `todayMostStar` smallint(6) NOT NULL DEFAULT '0' COMMENT '今天最大的星级数量',
  `lastTimeMostStar` smallint(6) NOT NULL DEFAULT '0' COMMENT '昨天最大的星级数量',
  `bigestJumpPoints` smallint(6) NOT NULL DEFAULT '0' COMMENT '最大跳过的关卡数量',
  `todayMostPoints` smallint(6) NOT NULL DEFAULT '0' COMMENT '今天最大的关卡数量',
  `challengingTimes` smallint(6) NOT NULL DEFAULT '0' COMMENT '今天挑战的次数',
  `lastFightTime` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '最后一次挑战的时间',
  `todayLastFightTime` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '今天最后一次挑战时间',
  PRIMARY KEY (`userUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='血战表';

-- --------------------------------------------------------

--
-- 表的结构 `buyLog`
--

CREATE TABLE IF NOT EXISTS `buyLog` (
  `userUid` bigint(20) unsigned NOT NULL COMMENT '用户ID',
  `shopUid` int(11) unsigned NOT NULL COMMENT '购买的商品ID',
  `count` int(11) NOT NULL COMMENT '购买的次数',
  PRIMARY KEY (`userUid`,`shopUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='购买记录';

-- --------------------------------------------------------

--
-- 表的结构 `card`
--

CREATE TABLE IF NOT EXISTS `card` (
  `userUid` bigint(20) unsigned NOT NULL,
  `cardUid` bigint(20) unsigned NOT NULL,
  `cardId` int(10) unsigned NOT NULL COMMENT '是什么卡片',
  `exp` int(11) NOT NULL DEFAULT '0',
  `level` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`cardUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='卡片(元气)';

-- --------------------------------------------------------

--
-- 表的结构 `cdkeyOwner`
--

CREATE TABLE IF NOT EXISTS `cdkeyOwner` (
  `userUid` bigint(20) unsigned NOT NULL COMMENT '领取key的用户',
  `giftID` int(11) NOT NULL COMMENT '领取的礼品ID',
  `key` varchar(15) NOT NULL COMMENT '领取的key',
  `time` int(10) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`userUid`,`giftID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- 表的结构 `compensateReceive`
--

CREATE TABLE IF NOT EXISTS `compensateReceive` (
  `userUid` bigint(20) unsigned NOT NULL COMMENT '用户唯一Id',
  `compensateId` int(10) unsigned NOT NULL COMMENT '补偿ID',
  `flag` tinyint(4) NOT NULL DEFAULT '0' COMMENT '领取标识',
  PRIMARY KEY (`userUid`,`compensateId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- 表的结构 `debris`
--

CREATE TABLE IF NOT EXISTS `debris` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `userUid` bigint(20) unsigned NOT NULL,
  `skillId` int(11) unsigned NOT NULL COMMENT '是什么技能',
  `type1` smallint(6) unsigned NOT NULL DEFAULT '0',
  `type2` smallint(6) unsigned NOT NULL DEFAULT '0',
  `type3` smallint(6) unsigned NOT NULL DEFAULT '0',
  `type4` smallint(6) unsigned NOT NULL DEFAULT '0',
  `type5` smallint(6) unsigned NOT NULL DEFAULT '0',
  `type6` smallint(6) unsigned NOT NULL DEFAULT '0',
  `operand` smallint(6) unsigned NOT NULL DEFAULT '1' COMMENT '可合成数',
  `operandNum` smallint(6) unsigned NOT NULL DEFAULT '0' COMMENT '已合成数',
  PRIMARY KEY (`id`),
  KEY `userUid` (`userUid`,`skillId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COMMENT='碎片(残章)' AUTO_INCREMENT=17622 ;

-- --------------------------------------------------------

--
-- 表的结构 `equipment`
--

CREATE TABLE IF NOT EXISTS `equipment` (
  `userUid` bigint(20) unsigned NOT NULL,
  `equipmentUid` bigint(20) unsigned NOT NULL COMMENT '装备ID',
  `equipmentId` int(11) unsigned NOT NULL COMMENT '具体的装备',
  `level` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '装备强化等级',
  `refining` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '精炼值',
  `refiningLevel` tinyint(4) unsigned NOT NULL DEFAULT '0' COMMENT '精炼等级',
  PRIMARY KEY (`equipmentUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='装备';

-- --------------------------------------------------------

--
-- 表的结构 `formation`
--

CREATE TABLE IF NOT EXISTS `formation` (
  `userUid` bigint(20) unsigned NOT NULL,
  `formationUid` int(11) unsigned NOT NULL,
  `heroUid` bigint(20) unsigned NOT NULL DEFAULT '0',
  `skill2` bigint(20) unsigned NOT NULL DEFAULT '0',
  `skill3` bigint(20) unsigned NOT NULL DEFAULT '0',
  `equip1` bigint(20) unsigned NOT NULL DEFAULT '0',
  `equip2` bigint(20) unsigned NOT NULL DEFAULT '0',
  `equip3` bigint(20) unsigned NOT NULL DEFAULT '0',
  `card1` bigint(20) unsigned NOT NULL DEFAULT '0',
  `card2` bigint(20) unsigned NOT NULL DEFAULT '0',
  `card3` bigint(20) unsigned NOT NULL DEFAULT '0',
  `card4` bigint(20) unsigned NOT NULL DEFAULT '0',
  `card5` bigint(20) unsigned NOT NULL DEFAULT '0',
  `card6` bigint(20) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`userUid`,`formationUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='编队';

-- --------------------------------------------------------

--
-- 表的结构 `freesummon`
--

CREATE TABLE IF NOT EXISTS `freesummon` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `userUid` bigint(20) unsigned NOT NULL,
  `type` tinyint(4) unsigned NOT NULL COMMENT '召唤类别',
  `time` int(10) unsigned NOT NULL COMMENT '上次抽时间',
  `count` tinyint(4) unsigned NOT NULL DEFAULT '0' COMMENT '免费召唤的次数',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COMMENT='召唤免费次数处理' AUTO_INCREMENT=20693 ;

-- --------------------------------------------------------

--
-- 表的结构 `fuse`
--

CREATE TABLE IF NOT EXISTS `fuse` (
  `userUid` bigint(20) unsigned NOT NULL,
  `hpLevel` int(11) unsigned NOT NULL DEFAULT '0',
  `hpExp` int(11) unsigned NOT NULL DEFAULT '0',
  `attackLevel` int(11) unsigned NOT NULL DEFAULT '0',
  `attackExp` int(11) unsigned NOT NULL DEFAULT '0',
  `defenceLevel` int(11) unsigned NOT NULL DEFAULT '0',
  `defenceExp` int(11) unsigned NOT NULL DEFAULT '0',
  `spiritLevel` int(11) unsigned NOT NULL DEFAULT '0',
  `spiritExp` int(11) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`userUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='融合(掌门口诀)';

-- --------------------------------------------------------

--
-- 表的结构 `hero`
--

CREATE TABLE IF NOT EXISTS `hero` (
  `userUid` bigint(20) unsigned NOT NULL,
  `heroUid` bigint(20) unsigned NOT NULL,
  `heroId` int(10) unsigned NOT NULL COMMENT '具体的弟子',
  `exp` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '弟子经验',
  `level` int(11) unsigned NOT NULL DEFAULT '1',
  `hp` int(11) NOT NULL DEFAULT '0' COMMENT '培养得到的血量',
  `attack` int(11) NOT NULL DEFAULT '0' COMMENT '培养得到的攻击',
  `defence` int(11) NOT NULL DEFAULT '0' COMMENT '培养得到的防御',
  `spirit` int(11) NOT NULL DEFAULT '0' COMMENT '培养得到的内',
  `skillLevel` int(11) unsigned NOT NULL DEFAULT '1' COMMENT '技能等级',
  `skillExp` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '技能参悟的累加值',
  `research` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '研究(闭关)院等级',
  `hpAdd` int(11) NOT NULL DEFAULT '0' COMMENT '培养而未接受的属性',
  `attackAdd` int(11) NOT NULL DEFAULT '0' COMMENT '培养而未接受的属性',
  `defenceAdd` int(11) NOT NULL DEFAULT '0' COMMENT '培养而未接受的属性',
  `spiritAdd` int(11) NOT NULL DEFAULT '0' COMMENT '培养而未接受的属性',
  `potential` int(11) NOT NULL DEFAULT '0' COMMENT '潜力值',
  `break` tinyint(4) unsigned NOT NULL DEFAULT '0' COMMENT '突破次数',
  `train` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '培养丹消耗',
  PRIMARY KEY (`heroUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- 表的结构 `heroSoul`
--

CREATE TABLE IF NOT EXISTS `heroSoul` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `userUid` bigint(20) unsigned NOT NULL,
  `heroId` int(11) unsigned NOT NULL,
  `count` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userUid` (`userUid`,`heroId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COMMENT='魂魄' AUTO_INCREMENT=47495 ;

-- --------------------------------------------------------

--
-- 表的结构 `item`
--

CREATE TABLE IF NOT EXISTS `item` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `userUid` bigint(20) unsigned NOT NULL,
  `itemId` varchar(10) NOT NULL COMMENT '道具的ID(非唯一ID)',
  `number` int(11) unsigned NOT NULL COMMENT '个数',
  `type` tinyint(4) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `userUid` (`userUid`,`itemId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COMMENT='道具表' AUTO_INCREMENT=98724 ;

-- --------------------------------------------------------

--
-- 表的结构 `mail`
--

CREATE TABLE IF NOT EXISTS `mail` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `rewardId` int(11) NOT NULL DEFAULT '0' COMMENT '奖励ID',
  `userUid` bigint(20) unsigned NOT NULL COMMENT '接收的用户ID',
  `sender` bigint(20) NOT NULL DEFAULT '-1' COMMENT '-1为系统',
  `status` tinyint(4) NOT NULL DEFAULT '0' COMMENT '0未读1已读2已领取',
  `message` text NOT NULL,
  `reward` text NOT NULL,
  `sendTime` int(11) NOT NULL DEFAULT '0' COMMENT '发送时间',
  `receiveTime` int(11) NOT NULL DEFAULT '0' COMMENT '接收时间',
  PRIMARY KEY (`id`),
  KEY `userUid` (`userUid`),
  KEY `sender` (`sender`),
  KEY `rewardId` (`rewardId`,`receiveTime`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=13781 ;

-- --------------------------------------------------------

--
-- 表的结构 `map`
--

CREATE TABLE IF NOT EXISTS `map` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `userUid` bigint(20) unsigned NOT NULL,
  `mapId` int(10) unsigned NOT NULL,
  `star` int(11) NOT NULL DEFAULT '0' COMMENT '星级,0为未胜利',
  `number` smallint(6) NOT NULL COMMENT '已闯次数',
  `preTime` bigint(20) NOT NULL COMMENT '上次闯的时间',
  `clearance` tinyint(4) NOT NULL DEFAULT '0' COMMENT '通关奖励',
  PRIMARY KEY (`id`),
  KEY `userUid` (`userUid`,`mapId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COMMENT='地图表' AUTO_INCREMENT=180999 ;

-- --------------------------------------------------------

--
-- 表的结构 `notice`
--

CREATE TABLE IF NOT EXISTS `notice` (
  `id` int(11) unsigned NOT NULL,
  `title` varchar(100) NOT NULL DEFAULT '',
  `scrollText` varchar(100) NOT NULL DEFAULT '',
  `name` varchar(30) NOT NULL DEFAULT '',
  `text` varchar(1000) NOT NULL DEFAULT '',
  `stime` int(10) unsigned NOT NULL DEFAULT '0',
  `etime` int(10) unsigned NOT NULL DEFAULT '1832947200',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='公告表';

-- --------------------------------------------------------

--
-- 表的结构 `payOrder`
--

CREATE TABLE IF NOT EXISTS `payOrder` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `orderNo` varchar(32) NOT NULL,
  `userUid` bigint(20) unsigned NOT NULL,
  `platformId` varchar(15) NOT NULL,
  `uin` varchar(15) NOT NULL DEFAULT '',
  `productId` varchar(4) NOT NULL,
  `goodsCount` int(11) NOT NULL DEFAULT '0',
  `orderMoney` varchar(15) NOT NULL DEFAULT '',
  `payStatus` tinyint(4) NOT NULL DEFAULT '0',
  `createTime` int(10) unsigned NOT NULL DEFAULT '0',
  `status` tinyint(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `orderNo` (`orderNo`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1845 ;

-- --------------------------------------------------------

--
-- 表的结构 `practiceConfig`
--

CREATE TABLE IF NOT EXISTS `practiceConfig` (
  `id` int(11) NOT NULL,
  `openTime` int(10) unsigned NOT NULL DEFAULT '0',
  `closeTime` int(11) NOT NULL DEFAULT '-1',
  `config` varchar(3000) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='修行（奇遇）的配置信息';

-- --------------------------------------------------------

--
-- 表的结构 `pvptop`
--

CREATE TABLE IF NOT EXISTS `pvptop` (
  `top` int(11) NOT NULL,
  `userUid` bigint(20) unsigned NOT NULL,
  `robot` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否机器人',
  PRIMARY KEY (`top`),
  KEY `userUid` (`userUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='pvp排行榜';

-- --------------------------------------------------------

--
-- 表的结构 `serverData`
--

CREATE TABLE IF NOT EXISTS `serverData` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(20) NOT NULL,
  `value` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `name` (`name`,`value`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=6 ;

-- --------------------------------------------------------

--
-- 表的结构 `skill`
--

CREATE TABLE IF NOT EXISTS `skill` (
  `userUid` bigint(20) NOT NULL,
  `skillUid` bigint(20) NOT NULL,
  `skillId` int(11) NOT NULL COMMENT '具体技能',
  `skillLevel` int(11) NOT NULL DEFAULT '1',
  `skillExp` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`skillUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='技能';

-- --------------------------------------------------------

--
-- 表的结构 `summon`
--

CREATE TABLE IF NOT EXISTS `summon` (
  `userUid` bigint(20) NOT NULL,
  `Ccount` smallint(6) NOT NULL DEFAULT '0' COMMENT 'C伙伴次数',
  `Bcount` smallint(6) NOT NULL DEFAULT '0' COMMENT 'B伙伴次数',
  `Acount` smallint(6) NOT NULL DEFAULT '0' COMMENT 'A伙伴次数',
  `Scount` smallint(6) NOT NULL DEFAULT '0' COMMENT 'S伙伴次数',
  `Bpoint` int(11) NOT NULL DEFAULT '0' COMMENT 'B伙伴积分',
  `Apoint` int(11) NOT NULL DEFAULT '0',
  `Spoint` int(11) NOT NULL DEFAULT '0',
  `BSpoint` int(11) NOT NULL DEFAULT '0',
  `ASpoint` int(11) NOT NULL DEFAULT '0',
  `SSpoint` int(11) NOT NULL DEFAULT '0',
  `summon1` smallint(6) NOT NULL DEFAULT '0' COMMENT '十挑一次数',
  `summon2` smallint(6) NOT NULL DEFAULT '0' COMMENT '百挑一次数',
  `summon3` smallint(6) NOT NULL DEFAULT '0' COMMENT '万挑一次数',
  `summonF1` smallint(6) NOT NULL DEFAULT '0' COMMENT '免费召唤的次数（10挑1）',
  `summonF2` smallint(6) NOT NULL DEFAULT '0' COMMENT '免费召唤的次数（100挑1）',
  `summonF3` smallint(6) NOT NULL DEFAULT '0' COMMENT '免费召唤的次数（1W挑1）',
  PRIMARY KEY (`userUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='召唤表';

-- --------------------------------------------------------

--
-- 表的结构 `switch`
--

CREATE TABLE IF NOT EXISTS `switch` (
  `id` smallint(6) NOT NULL,
  `open` int(11) NOT NULL DEFAULT '0',
  `sTime` int(11) unsigned NOT NULL DEFAULT '0',
  `eTime` int(10) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='功能开关表';

-- --------------------------------------------------------

--
-- 表的结构 `teach`
--

CREATE TABLE IF NOT EXISTS `teach` (
  `userUid` bigint(20) NOT NULL,
  `teachUid` bigint(20) NOT NULL,
  `id` tinyint(4) NOT NULL DEFAULT '1' COMMENT 'id类别 1群体 2单体',
  `level` int(11) NOT NULL DEFAULT '1' COMMENT '指点的级别',
  `time` int(11) NOT NULL DEFAULT '0' COMMENT '得到指点的时间',
  PRIMARY KEY (`teachUid`),
  KEY `userUid` (`userUid`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='获得的指点';

-- --------------------------------------------------------

--
-- 表的结构 `user`
--

CREATE TABLE IF NOT EXISTS `user` (
  `userUid` bigint(20) NOT NULL,
  `userName` varchar(10) NOT NULL,
  `exp` int(11) NOT NULL DEFAULT '0',
  `gold` int(11) NOT NULL DEFAULT '0',
  `ingot` int(11) NOT NULL DEFAULT '0',
  `pvePower` int(11) NOT NULL DEFAULT '0',
  `lastRecoverPvePower` bigint(20) NOT NULL DEFAULT '0' COMMENT '上次体力恢复时间',
  `pvpPower` int(11) NOT NULL DEFAULT '0',
  `lastRecoverPvpPower` bigint(20) NOT NULL DEFAULT '0' COMMENT '上次气恢复时间',
  `vip` int(11) NOT NULL DEFAULT '0',
  `momentum` int(11) NOT NULL DEFAULT '0' COMMENT '气势(出手先后)',
  `status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '用户状态2为新手引导完成',
  `createTime` int(10) unsigned NOT NULL DEFAULT '0',
  `platformId` varchar(20) NOT NULL DEFAULT '' COMMENT '平台ID',
  `pUserId` varchar(50) NOT NULL DEFAULT '' COMMENT '平台用户ID',
  PRIMARY KEY (`userUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='玩家表';

-- --------------------------------------------------------

--
-- 表的结构 `userGenerate`
--

CREATE TABLE IF NOT EXISTS `userGenerate` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `random` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COMMENT='用户id生成表' AUTO_INCREMENT=9189 ;

-- --------------------------------------------------------

--
-- 表的结构 `userOwner`
--

CREATE TABLE IF NOT EXISTS `userOwner` (
  `userUid` bigint(20) unsigned NOT NULL,
  `ownerId` int(10) unsigned NOT NULL,
  `createTime` int(10) unsigned NOT NULL,
  PRIMARY KEY (`userUid`),
  KEY `userUid` (`ownerId`,`userUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- 表的结构 `variable`
--

CREATE TABLE IF NOT EXISTS `variable` (
  `userUid` bigint(20) NOT NULL,
  `name` varchar(30) NOT NULL,
  `value` int(10) unsigned NOT NULL,
  `time` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '时间值',
  PRIMARY KEY (`userUid`,`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='玩家变量';

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
