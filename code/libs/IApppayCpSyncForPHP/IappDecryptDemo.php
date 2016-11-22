<?php

require 'IappDecrypt.php';

//以下三个数据为演示数据 trans_data和sign为报文中获取的字段，key为从商户自服务获取的应用密钥。
//$trans_data = '{"exorderno":"10004200000001100042","transid":"02113013118562300203","waresid":1,"appid":"20004600000001200046","feetype":0,"money":3000,"count":1,"result":0,"transtype":0,"transtime":"2013-01-31 18:57:27","cpprivate":"123456"}';
//$key = 'MjhERTEwQkFBRDJBRTRERDhDM0FBNkZBMzNFQ0RFMTFCQTBCQzE3QU1UUTRPRFV6TkRjeU16UTVNRFUyTnpnek9ETXJNVE15T1RRME9EZzROVGsyTVRreU1ETXdNRE0zTnpjd01EazNNekV5T1RJek1qUXlNemN4';
//$sign = '28adee792782d2f723e17ee1ef877e7 166bc3119507f43b06977786376c0434 633cabdb9ee80044bc8108d2e9b3c86e';


$appKey = $_SERVER['argv'][1];
$trans_data = $_SERVER['argv'][2];
$sign = $_SERVER['argv'][3];


$tools = new IappDecrypt();
$result = $tools->validsign($trans_data,$sign,$appKey);
if($result == 0)
	//验签名成功，添加处理业务逻辑的代码;
	echo 'SUCCESS';
else
	echo 'FAILED';
