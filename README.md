# Setup

You'll first need to install nodejs [here](https://nodejs.org/en/download/)

Then, go into your command line console and open up this
directory.

Run the following to install dependencies
```bash
npm i
```

Setup some secrets configuration in `.env`. First, rename
`.env.temp` to `.env`. You'll need the private keys of your
trigger wallet, which is the one that holds the initial
funds (ETH + APE), and your kyc wallet. You'll also need to
specify your RPC provider url too.

Besides that, this below is the only part of `send.js` you
might have to modify
```javascript
/*
 * CHANGE THESE ACCORDINGLY
 */

// TODO: use this value to bid on gas
const TOTAL_GAS_FEE = ethers.utils.parseEther('0.2');
const PROOF_OVERRIDE = undefined;
```

`TOTAL_GAS_FEE` should be the amount of ETH you want you to
bid for gas. This would be the equivalent to how much you'd
pay given a certain gas price.

`PROOF_OVERRIDE` should be left untouched unless their API
goes down, at which point you can set this to be your merkle
proof and the script will not attempt to fetch it for your
wallet.

You'll also need to make sure your KYC wallet is approved
for Ape coin transfer by the land contract, as well as NFT
transfer by the custom contract. You'll need to
`setApprovalForAll` with the contract
[0x1d5623690979b712E9d58a4AB0e10F8505b24701](https://etherscan.io/address/0x1d5623690979b712E9d58a4AB0e10F8505b24701)

Lastly, make sure that your trigger wallet is holding
sufficient ETH and APE.

## Usage

To start the script, run
```
node send.js
```

It will attempt to send the bundle, and if it fails, you'll
need to manually rerun it.

You should see something like this on a successfully
submitted bundle:
```bash
node send.js
[INFO] merkleproof is 0x495ed9c06b32d8cd28e3efef8eb493a60dc857759fa4ce74c128bb6bfd28d68f,0x93b94a0e6de2f036c1657d36f0f5ff3ecbfc5ddf399140cb2350aab03558bfef,0xff66e3854cb5b99fbcc907f7b1d7b8a0e1cd324065c203919fceba2f36ca242e,0x1168dbc5737452e544b22f0f21d1dc16eda1fd7684962c4ad533335b915d123e,0x115130a853544c20f949731242f7014cf89b64fc706a22ff44c8534b48f751c6,0x1de12d7f8789c7f4385f5cc78a28c383e6cd7204c2e0c5324c548e528e27f176,0xcadc4a9bca085d5cf36d2107ab30a4e53672738289a5eb91abc9cca0130eb2aa,0x9798fc05b7104a781c4cb614a53b3cf6bab191417ff0ed65013cd9188076c839,0xdb46779da4337f9534b8dce126dc50f5567e051400243a04aad3cddca921b490,0xa33dfba42b892afc231224addf9d1eac2b4ed554f3ec6bbe2cf1015b7475e886,0x9c60d89970a6902ffca631941456f1b4b8516cb09c87c9a78fb68d792ba57989,0x38667cdf32cbefa84358712c277fc36c9cd11865bcab087bc5ee5afeaa591b96,0x80bd7522c76b8374a1f482807cecbfd6767121122c502145b0df519ac217c781,0xb383a204567592765c379a7e840377c8d6490a3c6a08125c95ce7d6947fe077d,0x3a76a3b0f46fc52190511c494206a9aa393056cb3071e9759131a3fd61bd7375,0xe9d8af5d5b592c8e4bf8cb4ca43603b98b0d6e9954aa31f3a60a07223b71cfb1,0x408764f0e47f439db471d16fd828d6466934fdc22accae62ca3b1c4ce63bb7fd
[INFO] running flashbot task
[INFO] Awaiting block number
[INFO] latest mined block: 6808456
[Sat, 30 Apr 2022 22:35:02 GMT] [INFO][FB] Sending to flashbots...
SIMULATED TX: {
  bundleHash: '0x3f0a5deb6d5b186ee6128f3653161a94ad4549473a5c3978f4a1115a1fba9a8d',
  coinbaseDiff: BigNumber { _hex: '0x2386f26fc10000', _isBigNumber: true },
  results: [
    {
      coinbaseDiff: '0',
      ethSentToCoinbase: '0',
      fromAddress: '0xf52F459D8944230D4AA22C38fA8F83E08e66D51d',
      gasFees: '0',
      gasPrice: '0',
      gasUsed: 51743,
      toAddress: '0x750Fe3F102B7051896Ff72241F38F27F71696FC6',
      txHash: '0x5623fa25bff7179423f5c22dffb4d491326b85c5a10eedf59ce409b3eb23240a',
      value: '0x0000000000000000000000000000000000000000000000000000000000000001'
    },
    {
      coinbaseDiff: '0',
      ethSentToCoinbase: '0',
      fromAddress: '0xf52F459D8944230D4AA22C38fA8F83E08e66D51d',
      gasFees: '0',
      gasPrice: '0',
      gasUsed: 21000,
      toAddress: '0x678Fa95cA02caeAc19369887163321CcBcEf52Ed',
      txHash: '0x1df1619775dcc6e1ead4ba9cb9a4c380b74e0962e2798c295d8698a4e0063662',
      value: '0x'
    },
    {
      coinbaseDiff: '0',
      ethSentToCoinbase: '0',
      fromAddress: '0x678Fa95cA02caeAc19369887163321CcBcEf52Ed',
      gasFees: '0',
      gasPrice: '0',
      gasUsed: 354800,
      toAddress: '0x7f14d1655f443Bbcc9d0F8E5B02A996107616224',
      txHash: '0x3e8b42b791a8fbf51dfe6cbcf7719eb190d5a45dea20448c86987b9a57980a4e',
      value: '0x'
    },
    {
      coinbaseDiff: '10000000000000000',
      ethSentToCoinbase: '10000000000000000',
      fromAddress: '0x678Fa95cA02caeAc19369887163321CcBcEf52Ed',
      gasFees: '0',
      gasPrice: '64865986871',
      gasUsed: 154164,
      toAddress: '0x35fBFF53c81a9a1dF3bd499700B6205Cf3E1C7DC',
      txHash: '0x750a9b4eb7b15d7fe6ad60a8972ec6216edca53c72648e60e1354bde8af0d7c8',
      value: '0x'
    }
  ],
  totalGasUsed: 581707,
  firstRevert: undefined
}
```

NOTE: you may need to submit the bundle multiple times even
if they simulate fine on your end. The current block may not
end up being mined by Flashbots and so even valid bundles
will not be included.

## License
[MIT](https://choosealicense.com/licenses/mit/)
