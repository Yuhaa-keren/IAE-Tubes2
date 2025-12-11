const crypto = require('crypto');
const fs = require('fs');

// Generate pasangan kunci RSA
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Simpan ke file
fs.writeFileSync('private.key', privateKey);
fs.writeFileSync('public.key', publicKey);

console.log("✅ Berhasil! private.key dan public.key telah dibuat.");