const axios = require('axios');
const ethers = require("ethers");
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const flashbots = require("@flashbots/ethers-provider-bundle");

require('dotenv').config();

/*
 * CONFIGURATION
 */

// TODO CHANGE BEFORE LIVE
const CONTRACT_ADDRESS_LAND = "0x34d85c9CDeB23FA97cb08333b511ac86E1C4E258";
const CONTRACT_ADDRESS_SENDER = "0x1d5623690979b712E9d58a4AB0e10F8505b24701";
const CONTRACT_ADDRESS_TOKEN = "0x4d224452801ACEd8B2F0aebE155379bb5D594381";

// GAS FEES
const MAX_FEE = 400000000000;
const GAS_LIMIT_SEND_TOKEN = 60000;
const GAS_LIMIT_MINT = 400000;
const GAS_LIMIT_TRANSFER = 200000;

/*
 * CHANGE THESE ACCORDINGLY
 */

// TODO: use this value to bid on gas
const TOTAL_GAS_FEE = ethers.utils.parseEther('0.2');
const PROOF_OVERRIDE = undefined;







// leave these alone
const BASE_GAS_ETH = ethers.utils.parseEther('0.14192');
const MINER_TIP = TOTAL_GAS_FEE.sub(BASE_GAS_ETH);

// config
// TODO CHANGE BEFORE LIVE
const DEBUG = false;
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
  [ FLASHBOTS_ENDPOINT_MAINNET, false, ],
];

const FLASHBOTS_CHAIN_ID_MAINNET = 1;
const FLASHBOTS_CHAIN_ID_GOERLI = 5;
const FLASHBOTS_CHAIN_ID = DEBUG
  ? FLASHBOTS_CHAIN_ID_GOERLI
  :FLASHBOTS_CHAIN_ID_MAINNET;

const PREFIRE_BLOCKS = 3

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

  let proof;
  try {
    if (PROOF_OVERRIDE != undefined) {
      proof = PROOF_OVERRIDE;
    }
    else {
      proof = await genMerkleData(walletKYC.address);

    }
  }
  catch (e) {
    console.log('[ERROR]', 'KYC wallet doesnt have merkleproof');
    return;
  }
  console.log('[INFO]', `merkleproof is ${proof}`);

  mintFlashbots(proof);

})();

const genMerkleData = async (walletAddress) => {
  const endpoint = `https://api.otherside.xyz/proofs/${walletAddress}`;
  const resp = await axios.get(endpoint);
  const proof = resp.data;
  return proof;
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
    // send APE to kyc wallet
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
    // send ETH to kyc wallet for base gas
    {
      transaction: {
        chainId: FLASHBOTS_CHAIN_ID,
        type: EIP_1559,
        value: TOTAL_GAS_FEE,
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
        value: MINER_TIP,
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
