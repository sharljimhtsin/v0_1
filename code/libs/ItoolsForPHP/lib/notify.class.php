<?php
class notify
{
	private $pubKey = '';
	private $pubRes = '';

	public function __construct() 
	{
		$pubKeyPath = dirname(dirname(__FILE__)) . '/key/rsa_public_key.pem';

		$this->pubKey = file_get_contents($pubKeyPath);
		$this->pubRes = openssl_get_publickey($this->pubKey);
	}

	/**
	* 解密数据
	*/
	public function decrypt($data)
	{
		$data = base64_decode($data);
		$maxlength = 128;
		$output = '';
		while ($data) {
			$input = substr($data, 0, $maxlength);
			$data = substr($data, $maxlength);
			openssl_public_decrypt($input, $out, $this->pubRes);

			$output .= $out;
		}

		return $output;
	}

	/**
	* 签名验证
	*/
	public function verify($data, $sign)
	{
		$result = openssl_verify($data, base64_decode($sign), $this->pubRes);

		return $result;
	}

	public function __destruct()
	{
		openssl_free_key($this->pubRes);
	}
}
?>
