import { BigNumber, constants } from "ethers";
import { ethers, network } from "hardhat";
import {
  MasterChefV2,
} from "../typechain-types";
import * as fs from 'fs';
import { string } from "hardhat/internal/core/params/argumentTypes";
const ADDRESSES: {
  [network: string]: {
    NUTWCFX: string;
    XCFXWCFX: string;
    NUT: string;
    NUTWCFXMasterChefV2: string;
    XCFXWCFXMasterChefV2: string;
  };
} = {
  testnet: {
    NUTWCFX: "",
    XCFXWCFX: "",
    NUT: "",
    NUTWCFXMasterChefV2: "",
    XCFXWCFXMasterChefV2: "",
  },
  espace: {
    NUTWCFX: "",
    XCFXWCFX: "",
    NUT: "",
    NUTWCFXMasterChefV2: "",
    XCFXWCFXMasterChefV2: "",
  },
};
const MAX_SUPPLY = ethers.utils.parseEther("300000");
let masterChefV2: MasterChefV2;
let mockToken = require(`../test/PPIToken.sol/PPIToken.json`);
async function main() {
  const [deployer] = await ethers.getSigners();
  const addresses = ADDRESSES[network.name];
  if (addresses.NUTWCFX !== "") {
    console.log("👉 Found NUTWCFX contract at:", addresses.NUTWCFX);
  }else{
    // @note Testing ONLY
    const NUTWCFXContractFactory  = new ethers.ContractFactory(mockToken.abi, mockToken.bytecode, deployer);
    const NUTWCFXContract = await NUTWCFXContractFactory.deploy();
    await NUTWCFXContract.deployed();
    const tx = await NUTWCFXContract.mint(deployer.address, '1000000');
    await tx.wait();
    console.log("✅ Deployed mock NUTWCFX at:", NUTWCFXContract.address);
    addresses.XCFXWCFX = NUTWCFXContract.address;
  }
  if (addresses.XCFXWCFX !== "") {
    console.log("👉 Found XCFXWCFX contract at:", addresses.XCFXWCFX);
  }else{
    // @note Testing ONLY
    const XCFXWCFXContractFactory  = new ethers.ContractFactory(mockToken.abi, mockToken.bytecode, deployer);
    const XCFXWCFXContract = await XCFXWCFXContractFactory.deploy();
    await XCFXWCFXContract.deployed();
    const tx = await XCFXWCFXContract.mint(deployer.address, '2000000');
    await tx.wait();
    console.log("✅ Deployed mock XCFXWCFX at:", XCFXWCFXContract.address);
    addresses.XCFXWCFX = XCFXWCFXContract.address;
  }
  if (addresses.NUT !== "") {
    console.log("👉 Found XCFXWCFX contract at:", addresses.XCFXWCFX);
  }else{
    // @note Testing ONLY
    const NUTContractFactory  = new ethers.ContractFactory(mockToken.abi, mockToken.bytecode, deployer);
    const NUTContract = await NUTContractFactory.deploy();
    await NUTContract.deployed();
    const tx = await NUTContract.mint(deployer.address, MAX_SUPPLY);
    await tx.wait();
    console.log("✅ Deployed mock NUT at:", NUTContract.address);
    addresses.NUT = NUTContract.address;
  }
  const ONEMONTH = 2628000; // 2628000; //TODO: change to 2628000 10800
  const TIMEOFFSETBASE = 0;
  const TOTALAMOUNTOFMONTHS = 4 * 12; // 4 years
  const startTimeOffset: number[] = new Array(TOTALAMOUNTOFMONTHS);
  const rawXETWCFXRewardsPerSecond: number[] = new Array(
    445830,
    419489,
    394704,
    371384,
    349442,
    328796,
    309370,
    291091,
    273893,
    257711,
    242484,
    228158,
    214678,
    201994,
    190060,
    178830,
    168265,
    158323,
    148969,
    140167,
    131886,
    124094,
    116762,
    109863,
    103372,
    97265,
    91518,
    86111,
    81023,
    76236,
    71732,
    67494,
    63506,
    59754,
    56224,
    52902,
    49776,
    46835,
    44068,
    41464,
    39015,
    36710,
    34541,
    32500,
    30580,
    28773,
    27073,
    25473,
  );
  const rawWCFXXCFXRewardsPerSecond: number[] = new Array(
    668745,
    629234,
    592057,
    557076,
    524163,
    493194,
    464055,
    436637,
    410839,
    386566,
    363727,
    342237,
    322016,
    302991,
    285089,
    268245,
    252397,
    237485,
    223453,
    210251,
    197829,
    186141,
    175143,
    164795,
    155059,
    145897,
    137277,
    129167,
    121535,
    114354,
    107598,
    101241,
    95259,
    89631,
    84335,
    79353,
    74664,
    70253,
    66102,
    62197,
    58522,
    55064,
    51811,
    48750,
    45870,
    43159,
    40610,
    38210,
  );
  const XETWCFXRewardsPerSecond: BigNumber[] = new Array(TOTALAMOUNTOFMONTHS);
  const WCFXXCFXRewardsPerSecond: BigNumber[] = new Array(TOTALAMOUNTOFMONTHS);
  XETWCFXRewardsPerSecond[0] = BigNumber.from(rawXETWCFXRewardsPerSecond[0]).mul(ethers.utils.parseEther("1")).div(100).div(ONEMONTH);
  WCFXXCFXRewardsPerSecond[0] = BigNumber.from(rawWCFXXCFXRewardsPerSecond[0]).mul(ethers.utils.parseEther("1")).div(100).div(ONEMONTH);
  startTimeOffset[0] = TIMEOFFSETBASE;
  // console.log(
  //   "set emission: ",
  //   startTimeOffset[0],
  //   XETWCFXRewardsPerSecond[0],
  //   WCFXXCFXRewardsPerSecond[0]
  // );
  for (let i = 1; i < startTimeOffset.length; i++) {
    startTimeOffset[i] = startTimeOffset[i - 1] + ONEMONTH;
    XETWCFXRewardsPerSecond[i] = BigNumber.from(rawXETWCFXRewardsPerSecond[i]).mul(ethers.utils.parseEther("1")).div(100).div(ONEMONTH);
    WCFXXCFXRewardsPerSecond[i] = BigNumber.from(rawWCFXXCFXRewardsPerSecond[i]).mul(ethers.utils.parseEther("1")).div(100).div(ONEMONTH);
    // console.log(
    //   "set emission: ",
    //   startTimeOffset[i],
    //   XETWCFXRewardsPerSecond[i],
    //   WCFXXCFXRewardsPerSecond[i]
    // );
  }
  let totalAmount = BigNumber.from(0);
  for (let i = 0; i < startTimeOffset.length; i++) {
    console.log(
      "set emission: ",
      startTimeOffset[i],
      XETWCFXRewardsPerSecond[i].toString(),
      WCFXXCFXRewardsPerSecond[i].toString()
    );
    totalAmount = totalAmount.add(XETWCFXRewardsPerSecond[i]).add(WCFXXCFXRewardsPerSecond[i]);
  }
  totalAmount = totalAmount.mul(ONEMONTH);
  console.log("👉 Total amount: ", totalAmount);
  if (addresses.NUTWCFXMasterChefV2 !== "") {
    masterChefV2 = await ethers.getContractAt("MasterChefV2", addresses.NUTWCFXMasterChefV2, deployer);
    console.log("👉 Found NUTWCFX MasterChefV2 contract at:", masterChefV2.address);
  }else{
    const masterChefV2Factory  = await ethers.getContractFactory("MasterChefV2", deployer);
    // getting timestamp
    var blockNumBefore = await ethers.provider.getBlockNumber();
    var blockBefore = await ethers.provider.getBlock(blockNumBefore);
    var timestampBefore = blockBefore.timestamp;
    const masterChefV2 = await masterChefV2Factory.deploy(addresses.NUT, timestampBefore, startTimeOffset, XETWCFXRewardsPerSecond, MAX_SUPPLY.mul(595).div(1000).mul(4).div(10));
    await masterChefV2.deployed();
    console.log("✅ Deployed NUTWCFXMasterChefV2 at:", masterChefV2.address);
    addresses.NUTWCFXMasterChefV2 = masterChefV2.address;
  }
  if (addresses.XCFXWCFXMasterChefV2 !== "") {
    masterChefV2 = await ethers.getContractAt("MasterChefV2", addresses.XCFXWCFXMasterChefV2, deployer);
    console.log("👉 Found NUTWCFX MasterChefV2 contract at:", masterChefV2.address);
  }else{
    const masterChefV2Factory  = await ethers.getContractFactory("MasterChefV2", deployer);
    // getting timestamp
    var blockNumBefore = await ethers.provider.getBlockNumber();
    var blockBefore = await ethers.provider.getBlock(blockNumBefore);
    var timestampBefore = blockBefore.timestamp;
    const masterChefV2 = await masterChefV2Factory.deploy(addresses.NUT, timestampBefore, startTimeOffset, XETWCFXRewardsPerSecond, MAX_SUPPLY.mul(595).div(1000).mul(6).div(10));
    await masterChefV2.deployed();
    console.log("✅ Deployed XCFXWCFXMasterChefV2 at:", masterChefV2.address);
    addresses.XCFXWCFXMasterChefV2 = masterChefV2.address;
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
