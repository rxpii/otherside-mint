const axios = require('axios');
const ethers = require("ethers");
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const flashbots = require("@flashbots/ethers-provider-bundle");

require('dotenv').config();

// config
const DEBUG = true;
const ETHER = ethers.BigNumber.from(10).pow(18);
const GWEI = ethers.BigNumber.from(10).pow(9);
const EIP_1559 = 2;

// settings
const WALLET_PRIVATE_KEY_TRIGGER = process.env.WALLET_PRIVATE_KEY_TRIGGER;
const WALLET_PRIVATE_KEY_KYC = process.env.WALLET_PRIVATE_KEY_KYC;
const RPC_PROVIDER = process.env.RPC_PROVIDER;
const FLASHBOTS_ENDPOINT_MAINNET = "https://relay.flashbots.net";
const FLASHBOTS_ENDPOINT_ETHERMINE = "https://mev-relay.ethermine.org";
const FLASHBOTS_ENDPOINT_GOERLI = "https://relay-goerli.flashbots.net";

let FLASHBOTS_ENDPOINTS = DEBUG ? [
  [ FLASHBOTS_ENDPOINT_GOERLI, false, ],
] : [
  [ FLASHBOTS_ENDPOINT_ETHERMINE, true, ],
  [ FLASHBOTS_ENDPOINT_EDEN, true, ],
  [ FLASHBOTS_ENDPOINT_MAINNET, false, ],
];

const FLASHBOTS_CHAIN_ID_MAINNET = 1;
const FLASHBOTS_CHAIN_ID_GOERLI = 5;
const FLASHBOTS_CHAIN_ID = DEBUG
  ? FLASHBOTS_CHAIN_ID_GOERLI
  :FLASHBOTS_CHAIN_ID_MAINNET;


// generally no need to modify between contracts
const PREFIRE_BLOCKS = 3

const CONTRACT_ADDRESS_LAND = "0x7f14d1655f443Bbcc9d0F8E5B02A996107616224";
const CONTRACT_ADDRESS_SENDER = "0x35fBFF53c81a9a1dF3bd499700B6205Cf3E1C7DC";
const CONTRACT_ADDRESS_TOKEN = "0x750Fe3F102B7051896Ff72241F38F27F71696FC6";

// GAS FEES
const MAX_FEE = 100;
const GAS_LIMIT_SEND_TOKEN = 100000;
const GAS_LIMIT_MINT = 400000;
const GAS_LIMIT_TRANSFER = 400000;

// FUNCTION DATA
// this is the data payload send along with your transaction
// this MUST be consisted with the mint function name, the mint amount, and other parameters
// to the mint function
const FUNCTION_DATA_VOX = "0x40c10f190000000000000000000000008403e29de6c446f91414a619440030144662ec1d0000000000000000000000000000000000000000000000000000000000000001";

const getFlashbotsProviders = (provider, wallet, endpoints) => {
  return Promise.all(endpoints.map(async (endpointInfo) => {
    const [ endpoint, sendRaw ] = endpointInfo;
    return [ await flashbots.FlashbotsBundleProvider.create(provider, wallet, endpoint), sendRaw ];
  }));
}

const performSendBundle = (flashbotsProvider, bundle, blockNumber, sendRaw) => {
  flashbotsProvider.sendBundle(bundle, blockNumber)
    .then(async (bundleResponse) => {
      //console.log("Wallet rep:", await flashbotsProvider.getUserStats());
      if ('error' in bundleResponse) {
        console.log("BUNDLE ERROR:", bundleResponse.error.message);
        return;
      }
      if (!sendRaw) console.log("SIMULATED TX:", await bundleResponse.simulate());
      else console.log("BUNDLE RESPONSE:", bundleResponse);
    });
}

const getProvider = (endpoint) => {
  return new ethers.providers.JsonRpcProvider(endpoint);
}

const getWallet = (privateKey, provider) => {
  return new ethers.Wallet(privateKey, provider);
}

let blockNumber;
let provider;
let walletTrigger;
let walletKYC;
let flashbotsProviders;
let nonceTrigger;
let nonceKYC;

(async () => {
  blockNumber = undefined;
  provider = getProvider(RPC_PROVIDER);
  walletTrigger = getWallet(WALLET_PRIVATE_KEY_TRIGGER, provider);
  walletKYC = getWallet(WALLET_PRIVATE_KEY_KYC, provider);
  flashbotsProviders = await getFlashbotsProviders(provider, walletTrigger, FLASHBOTS_ENDPOINTS);
  nonceTrigger = await provider.getTransactionCount(walletTrigger.address);
  nonceKYC = await provider.getTransactionCount(walletKYC.address);

  provider.on("block", async (_blockNumber) => {
    blockNumber = _blockNumber;
    console.log('[INFO]', `latest mined block: ${blockNumber}`);
  });

  // console.log(getMerkleProof());
  // return;
  let proof;
  try {
    proof = await genMerkleData(walletKYC.address);
  }
  catch (e) {
    console.log('[ERROR]', 'KYC wallet doesnt have merkleproof');
    return;
  }
  console.log('[INFO]', `merkleproof is ${proof}`);

  mintFlashbots(proof);

})();

const genMerkleData = async (walletAddress) => {
  /*
  const endpoint = `https://api.otherside.xyz/proofs/${walletAddress}`;
  const resp = await axios.get(endpoint);
  const proof = resp.data;
  return proof;
  */

  const kycWallets = [ '0x7571983F79416F3E672FE76851F5A5523f56c4F5', '0xEb359D4fe7cC9b6C4a92e5E7aDd9f021c7eBf9CB', '0x176d57af31DE62d6Ec0cdeBc973ea7df2ab0767b', '0xB7AF35cDcCfF99B5dC3A11E2F19C5e2c1c49e48F' ];
  const leafNodes = kycWallets.map(addr => keccak256(addr));
  const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });

  const root = merkleTree.getRoot().toString('hex');
  const walletHash = leafNodes[3];
  const proof = merkleTree.getHexProof(walletHash);
  console.log(root);
  return proof;
}


const getMerkleProof = () => {
  const proof = ["0x9c5283537e9b8c35a884254c25f19f3d252e69ba3be83275951830cf5166b3f0","0x2484026e6ba8843a7fa4a6ac1a6cf55b6d2005de9e0e612c7fade6c44f68f692","0x06ad86dee685327a1b2796b6e37b6fbf0b179f8f4b4ca4f9adfd5a797f58efe3","0xfc4f6c817840a8e4176cce548a3957f4d334cf26f4dee948d99089db1b0329b8","0xfc7f6c76d3b34e171d5dd7b120cc4b64f425768c57d6fe05447d08b4a213fb48","0x4c94bc5ae661e383949d2c1e98491770a87e4d113a0ce0a9e7a4e24e7e37d740","0x09f152e3a9a179e2885e7aa83d73d441f2926f437639a837bd984a83a87265e2","0xf87810bb1034e4c91071a996e5906d8ef1b252274d46cf423ac2a09eb9d6b89c","0x5cd59da5e1e8c675764a775e9518f66946d50bc103d27081f7da402d3a034502","0x3050d5f48e1cd08c321613ffee5b289afd33846770937b21db4e769d72cc77c3","0x63730ea1b48c185260513b2ae87bb5583390f936f082a9a5a329a498eda3dd9f","0x57b0b1672c023ff670a16b4d17284ef5b19cb6ab12d52849d1e23aede181d9f9","0x0ff12b25b85be5de554ff3220d3ad9ef3074effd81ac4412de9f6df4242dc636","0x0dbd308a126efac4ddbd4a845054c3960f80220e7d1241ad38f757845fc636a7","0x6b16c1f9303129d0c960d8b254fd50cca9993e0a77bbc4ee3451a6fe19e283a6","0xad3f757f8d068de78aacb96a454743d418f1f7e870c92434e227693af60f139f","0x5b2f35616ef4997c7f30dcc8bb941919fb4bab170424187ae676a1594ba69bc0"];
  let computedHash = keccak256('0xB7AF35cDcCfF99B5dC3A11E2F19C5e2c1c49e48F');
  // const proof = ["0x8a96b8f142132798b40d3330d79f79aae7fa4285a7e7f40fe7d8ee672f9f51f5","0xac54d85734c3fed02356a8ee917efa10b1afa73da2c8236a3baa692cfb435ccc","0xc4864545d1083859ccf28ce59c7e1c957565f9edd817da533e857e138d2e5662","0x1e370a356428ffd62ab4bdca599d1403db274646479e3c0d29ed63262022f1ba","0x9a73bde01fbc15f0597fd5342ef4102a5a7acf239e0ee4a0bbb7c0dcf14242ff","0xeac6213dfd48ff8cf0b7b8e99e28f4a90b0bd35cefad2a1f2c9308776de7939f","0x319fd4dadc9be17ca861240a3f637c156172be6163467b5d0f45346d34dd0fea","0x99f6b0df1b119537bd6c6f9cdcb19077e5a085dbc7eb2a6ccb6673074742e8f0","0x4b7b0379aa3179e0682ef6b2a5540caf2ae1f98acbcc9a6d490b68eed98ce5b2","0x24b47c79755cbc8b18b6cadf0e7d089403c468f8573d9c1a1ab846b463dd3bca","0x1daa8775edab1e02e912d156d8209c05285808295610abea6401054986798a8f","0x47e2c79907bde813f678e281391849e28f09fbc9ab5339605eaeba576783d023","0xf202a716de443ad516105e94ebd5e3a3fad68f7d86322f4387a89577c5e5ae76","0xce8071af5ddd6fc8ff563a8f872eec0711f3bc8c4249313d1e5df986141951ca","0x9af372de5cbf6c90f4b34ac0ae5470930660603675591e2a52fc4e246cf59bcc","0xad3f757f8d068de78aacb96a454743d418f1f7e870c92434e227693af60f139f","0x5b2f35616ef4997c7f30dcc8bb941919fb4bab170424187ae676a1594ba69bc0"];
  // let computedHash = keccak256('0x176d57af31DE62d6Ec0cdeBc973ea7df2ab0767b');

  for (let i = 0; i < proof.length; i++) {
    const proofElement = proof[i];

    if (computedHash <= proofElement) {
      // Hash(current computed hash + current element of the proof)
      computedHash = ethers.utils.solidityKeccak256([ "string", "string" ], [ computedHash, proofElement ])
    } else {
      // Hash(current element of the proof + current computed hash)
      computedHash = ethers.utils.solidityKeccak256([ "string", "string" ], [ proofElement, computedHash ])
    }
  }
  return computedHash;
}

const getSendTokenData = (to) => {
  const ABI = [ 'function transferIn(address payable to)' ];

  const iface = new ethers.utils.Interface(ABI);
  const data = iface.encodeFunctionData("transferIn", [ to ]);
  return data;
}

const getSendTokenRawData = (to) => {
  const ABI = [ 'function transfer(address recipient, uint256 amount)' ];

  const price = ethers.BigNumber.from('610000000000000000000');
  const iface = new ethers.utils.Interface(ABI);
  const data = iface.encodeFunctionData("transfer", [ to, price ]);
  return data;
}

const getMintData = (proof) => {
  const ABI = [ 'function mintLands(uint256 numLands, bytes32[] calldata merkleProof)' ];

  const iface = new ethers.utils.Interface(ABI);
  const data = iface.encodeFunctionData("mintLands", [ 2, proof ]);
  return data;
}

const getTransferData = (to) => {
  const ABI = [ 'function send(address to)' ];

  const iface = new ethers.utils.Interface(ABI);
  const data = iface.encodeFunctionData("send", [ to ]);
  return data;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getCurrentISOTime = () => {
  return new Date().toUTCString()
}

const mintFlashbots = async (proof) => {
  console.log('[INFO]', 'running flashbot task');

  const bundle = [
    // transfer tokens and eth for gas to kyc wallet
    // {
      // transaction: {
        // chainId: FLASHBOTS_CHAIN_ID,
        // type: EIP_1559,
        // value: ethers.utils.parseEther('0.0105'),
        // data: getSendTokenData(walletKYC.address),
        // maxFeePerGas: MAX_FEE,
        // maxPriorityFeePerGas: 0,
        // gasLimit: GAS_LIMIT_SEND_TOKEN,
        // to: CONTRACT_ADDRESS_SENDER,
        // nonce: nonceTrigger,
      // },
      // signer: walletTrigger,
    // },

    {
      transaction: {
        chainId: FLASHBOTS_CHAIN_ID,
        type: EIP_1559,
        value: ETHER.mul(0),
        data: getSendTokenRawData(walletKYC.address),
        maxFeePerGas: MAX_FEE,
        maxPriorityFeePerGas: 0,
        gasLimit: GAS_LIMIT_SEND_TOKEN,
        to: CONTRACT_ADDRESS_TOKEN,
        nonce: nonceTrigger,
      },
      signer: walletTrigger,
    },
    {
      transaction: {
        chainId: FLASHBOTS_CHAIN_ID,
        type: EIP_1559,
        value: ethers.utils.parseEther('0.0105'),
        data: '0x',
        maxFeePerGas: MAX_FEE,
        maxPriorityFeePerGas: 0,
        gasLimit: GAS_LIMIT_SEND_TOKEN,
        to: walletKYC.address,
        nonce: nonceTrigger + 1,
      },
      signer: walletTrigger,
    },
    // mint with kyc wallet
    {
      transaction: {
        chainId: FLASHBOTS_CHAIN_ID,
        type: EIP_1559,
        value: ETHER.mul(0),
        data: getMintData(proof),
        maxFeePerGas: MAX_FEE,
        maxPriorityFeePerGas: 0,
        gasLimit: GAS_LIMIT_MINT,
        to: CONTRACT_ADDRESS_LAND,
        nonce: nonceKYC,
      },
      signer: walletKYC,
    },
    // transfer out to trigger wallet
    {
      transaction: {
        chainId: FLASHBOTS_CHAIN_ID,
        type: EIP_1559,
        value: ethers.utils.parseEther('0.0005'),
        data: getTransferData(walletTrigger.address),
        maxFeePerGas: MAX_FEE,
        maxPriorityFeePerGas: 0,
        gasLimit: GAS_LIMIT_TRANSFER,
        to: CONTRACT_ADDRESS_SENDER,
        nonce: nonceKYC + 1,
      },
      signer: walletKYC,
    },
  ];

  while (true) {
    if (!blockNumber) {
      console.log('[INFO]', 'Awaiting block number');
      await sleep(2500);
    }

    try {
      console.log(`[${getCurrentISOTime()}]`, '[INFO][FB]', 'Sending to flashbots...');
      flashbotsProviders.forEach(providerInfo => {
        const [ flashbotsProvider, sendRaw ] = providerInfo;
        for (let i = 1; i <= 3; i++) {
          performSendBundle(flashbotsProvider, bundle, blockNumber + i, sendRaw);
        }
      });
      break;
    }
    catch (error) {
      console.log("SEND TX ERROR:", error);
    }

    await sleep(2500);
  }
}

// catch reverts and ignore them
process.on('uncaughtException', err => {
  if (err.hasOwnProperty('code')
    && (err.code === "CALL_EXCEPTION"
      || err.code === "UNPREDICTABLE_GAS_LIMIT"
      || err.code === "SERVER_ERROR")) {
    console.error("Transaction reverted:", err.reason);
    return;
  }

  console.error("\nUNHANDLED EXCEPTION OCCURED", err);
  process.exit(1) //mandatory (as per the Node.js docs)
})
