<?php
/*
	爱思充值平台：http://pay.i4.cn/
	以下为示例代码
*/
include('Rsa.php');
include('MyRsa.php');

$data = base64_decode($argv[1]);
$list = json_decode($data,true);
testController::Appreturn($list);

class testController
{
	public static function Appreturn($list)
	{
		$notify_data = $list;
		$chkres = self::chk($notify_data);
		error_log(date("Y-m-d h:i:s")."result ".serialize($chkres)."\r\n",3,'rsa.log');
		if($chkres) {
			//验证通过
			//--------业务处理----------
			//
			echo "success";
		}else{
			echo "fail";
		}

	}
	
	//验证
	public static function chk($notify_data)
	{
		$privatedata = $notify_data['sign'];
		error_log(date("Y-m-d h:i:s").": ".serialize($privatedata)."\r\n",3,'rsa.log');
		
		$privatebackdata = base64_decode($privatedata);
		error_log(date("Y-m-d h:i:s")."base64_decode: ".serialize($privatebackdata)."\r\n",3,'rsa.log');
		$MyRsa = new MyRsa;
		//解密出来的数据
		$data = $MyRsa->rsa_decrypt($privatebackdata, $notify_data['publicKey']);
		error_log(date("Y-m-d h:i:s")."publickey_decodeing: ".$data."\r\n",3,'rsa.log');
		
		if(empty($data)){
			die("fail");
		}
		
		//$rs = json_decode($data,true);
		//error_log(date("Y-m-d h:i:s")."rs ".serialize($rs)."\r\n",3,'rsa.log');
		//if(empty($rs)||empty($notify_data))return false;
		//将解密出来的数据转换成数组
		foreach(explode('&', $data) as $val)
		{
			$arr = explode('=', $val);
			$dataArr[$arr[0]] = $arr[1];
		}
		error_log(date("Y-m-d h:i:s")."dataArr\t\t".var_export($dataArr, true)."\r\n",3,'rsa.log');
		//验证
		if($dataArr["billno"]==$notify_data['billno'] && $dataArr["amount"]==$notify_data['amount'] && $dataArr["status"]==$notify_data['status']) {
			return true; 
		}else{
			return false;
		}
	}

}
?>
 