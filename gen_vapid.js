const crypto = require('crypto');

function generateVAPIDKeys() {
  const curve = 'prime256v1';
  const ecdh = crypto.createECDH(curve);
  ecdh.generateKeys();

  const publicKey = ecdh.getPublicKey();
  const privateKey = ecdh.getPrivateKey();

  console.log('Public Key (Base64URL):', publicKey.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
  console.log('Private Key (Base64URL):', privateKey.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
}

generateVAPIDKeys();
