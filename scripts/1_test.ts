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
    MasterChefV2: string;
  };
} = {
  testnet: {
    NUTWCFX: "0xa39B6cB049A20AD39467734f18A499d53A15D1e4",
    XCFXWCFX: "0x93654706FA81508f48D5B98f16B9ed9829bCB37d",
    NUT: "0x30E5C8c5716682fFFC13b69E59369e0c7416c38f",
    MasterChefV2: "0x86E32085ebe5874990D51Df387a4D206F8f0b67E",
  },
  espace: {
    NUTWCFX: "",
    XCFXWCFX: "",
    NUT: "",
    MasterChefV2: "",
  },
};
// @note Here is total supply of NUT token
const MAX_SUPPLY = ethers.utils.parseEther("300000");
const ZEROADDRESS = '0x0000000000000000000000000000000000000000';
let MasterChefV2: MasterChefV2;
let mockToken = require(`../test/PPIToken.sol/PPIToken.json`);
let ierc20 = require(`../test/IERC20.sol/IERC20.json`);
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
    const tx = await NUTWCFXContract.mint(deployer.address, ethers.utils.parseEther('1000000'));
    await tx.wait();
    console.log("✅ Deployed mock NUTWCFX at:", NUTWCFXContract.address);
    addresses.NUTWCFX = NUTWCFXContract.address;
  }
  if (addresses.XCFXWCFX !== "") {
    console.log("👉 Found XCFXWCFX contract at:", addresses.XCFXWCFX);
  }else{
    // @note Testing ONLY
    const XCFXWCFXContractFactory  = new ethers.ContractFactory(mockToken.abi, mockToken.bytecode, deployer);
    const XCFXWCFXContract = await XCFXWCFXContractFactory.deploy();
    await XCFXWCFXContract.deployed();
    const tx = await XCFXWCFXContract.mint(deployer.address, ethers.utils.parseEther('2000000'));
    await tx.wait();
    console.log("✅ Deployed mock XCFXWCFX at:", XCFXWCFXContract.address);
    addresses.XCFXWCFX = XCFXWCFXContract.address;
  }
  if (addresses.NUT !== "") {
    console.log("👉 Found NUT contract at:", addresses.NUT);
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
    1114575,
    1048723,
    986761,
    928461,
    873605,
    821990,
    773425,
    727729,
    684732,
    644277,
    606211,
    570394,
    536694,
    504985,
    475149,
    447076,
    420661,
    395808,
    372422,
    350418,
    329715,
    310234,
    291905,
    274658,
    258431,
    243162,
    228795,
    215278,
    202558,
    190591,
    179330,
    168735,
    158765,
    149385,
    140559,
    132255,
    124441,
    117088,
    110170,
    103661,
    97537,
    91774,
    86352,
    81250,
    76449,
    71932,
    67683,
    63684,
  );
  const XETWCFXRewardsPerSecond: BigNumber[] = new Array(TOTALAMOUNTOFMONTHS);
  XETWCFXRewardsPerSecond[0] = BigNumber.from(rawXETWCFXRewardsPerSecond[0]).mul(ethers.utils.parseEther("1")).div(100).div(ONEMONTH);
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
      XETWCFXRewardsPerSecond[i].toString()
    );
    totalAmount = totalAmount.add(XETWCFXRewardsPerSecond[i]);
  }
  totalAmount = totalAmount.mul(ONEMONTH);
  console.log("👉 Total amount: ", totalAmount.toString());
  if (addresses.MasterChefV2 !== "") {
    MasterChefV2 = await ethers.getContractAt("MasterChefV2", addresses.MasterChefV2, deployer);
    console.log("👉 Found NUTWCFX MasterChefV2 contract at:", MasterChefV2.address);
  }else{
    const masterChefV2Factory  = await ethers.getContractFactory("MasterChefV2", deployer);
    // getting timestamp
    var blockNumBefore = await ethers.provider.getBlockNumber();
    var blockBefore = await ethers.provider.getBlock(blockNumBefore);
    var timestampBefore = blockBefore.timestamp;
    MasterChefV2 = await masterChefV2Factory.deploy(addresses.NUT, timestampBefore, startTimeOffset, XETWCFXRewardsPerSecond, MAX_SUPPLY.mul(595).div(1000));
    await MasterChefV2.deployed();
    console.log("✅ Deployed MasterChefV2 at:", MasterChefV2.address);
    addresses.MasterChefV2 = MasterChefV2.address;
  }
  let NUTWCFXTokenInterface = new ethers.Contract(addresses.NUTWCFX, ierc20.abi, deployer);
  let tx = await NUTWCFXTokenInterface.approve(addresses.MasterChefV2, ethers.utils.parseEther('1000000'));
  await tx.wait();
  tx = await MasterChefV2.deposit(0, ethers.utils.parseEther('1000000'), deployer.address);
  await tx.wait();
  console.log("✅ Deposited in MasterChefV2 at:", tx.hash);

  let XCFXCFXTokenInterface = new ethers.Contract(addresses.XCFXWCFX, ierc20.abi, deployer);
  tx = await XCFXCFXTokenInterface.approve(addresses.MasterChefV2, ethers.utils.parseEther('1000000'));
  await tx.wait();
  tx = await MasterChefV2.deposit(1, ethers.utils.parseEther('1000000'), deployer.address);
  await tx.wait();
  console.log("✅ Deposited in MasterChefV2 at:", tx.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
