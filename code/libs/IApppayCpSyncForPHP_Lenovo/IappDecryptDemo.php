<?php

require 'IappDecrypt.php';

//以下三个数据为演示数据 trans_data和sign为报文中获取的字段，key为从商户自服务获取的应用密钥。
$trans_data = base64_decode($argv[1]);
$sign = base64_decode($argv[2]);
$key = $argv[3];

$tools = new IappDecrypt();
$result = $tools->validsign($trans_data,$sign,$key);
if($result == 0)
	//验签名成功，添加处理业务逻辑的代码;
	echo 'SUCCESS';
else
	echo 'FAILED';
