#### 重置首充和连续登录的奖励领取

```sql
USE dragongame_1; DELETE FROM `variable` WHERE `name` = "totalCharge" OR `name` = "ctLogin";
```

```
redis-cli KEYS "variable:*" | xargs -I {} redis-cli HDEL {} ctLogin 
redis-cli KEYS "variable:*" | xargs -I {} redis-cli HDEL {} totalCharge
redis-cli -n 4 keys "variable*" | xargs redis-cli -n 4 del
```

#### 新表SQL

```sql
-- 2014-07-03
-- 表的结构 `specialBox`
--

CREATE TABLE IF NOT EXISTS `specialBox` (
  `userUid` bigint(11) NOT NULL,
  `itemId` int(11) NOT NULL,
  `goodProb` tinyint(4) NOT NULL,
  `probed` varchar(256) NOT NULL,
  `point` int(11) NOT NULL,
  PRIMARY KEY (`userUid`,`itemId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



```