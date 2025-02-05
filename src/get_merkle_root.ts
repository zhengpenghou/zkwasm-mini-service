import BN from "bn.js";

let merkle_root = new BigUint64Array([
    14789582351289948625n,
    10919489180071018470n,
    10309858136294505219n,
    2839580074036780766n,
]);

const combinedRoot = merkle_root[0] * BigInt(2**192) +
merkle_root[1] * BigInt(2**128) +
merkle_root[2] * BigInt(2**64) +
merkle_root[3];

let root_bn = combinedRoot;
console.log(root_bn);
console.log("0x"+root_bn.toString(16));
console.log('============')


const initial_root = new Uint8Array(
    [
    0xDE,0x5E,0x3D,0x58,0x08,0x37,0x68,0x27,0x03,0x3B,0x81,0xDA,0x59,0xF9,0x13,0x8F,0xE6,0xBF,0xDA,0x2A,0x8E,0xD1,0x89,0x97,0xD1,0x19,0x06,0x39,0xCA,0x26,0x3F,0xCD
    ]);

const rootBn = new BN(initial_root, 16, "be");
const rootBigInt = BigInt("0x" + rootBn.toString(16))

console.log(rootBigInt);

console.log('============')

const initialRoot = new Uint8Array([166, 157, 178, 62, 35, 83, 140, 56, 9, 235, 134, 184, 20, 145, 63, 43, 245    , 186, 75, 233, 43, 42, 187, 217, 104, 152, 219, 89, 125, 199, 161, 9]);

const rootBn1 = new BN(initialRoot, 16, "be");
const rootBigInt1 = BigInt("0x" + rootBn1.toString(16));
console.log(rootBigInt1);

console.log('============')
