import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.ENCRYPTION_KEY;

const encrypt = (text) => {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();  //AES stands for Advanced Encryption Standard. It’s a widely used algorithm for encrypting data, meaning it transforms readable data into unreadable ciphertext using a secret key.
};

const decrypt = (encryptedText) => {
    const bytes = CryptoJS.AES.decrypt(
        encryptedText,
        SECRET_KEY
    );

    return bytes.toString(CryptoJS.enc.Utf8);
};

export {
    encrypt,
    decrypt
};