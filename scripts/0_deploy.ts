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
    NUTWCFX: "",
    XCFXWCFX: "",
    NUT: "",
    MasterChefV2: "",
  },
  espace: {
    NUTWCFX: "0xd9d5748CB36a81FE58F91844F4A0412502FD3105",
    XCFXWCFX: "0x949b78eF2c8d6979098E195b08F27FF99cb20448",
    NUT: "0xFE197E7968807B311D476915DB585831B43A7E3b",
    MasterChefV2: "0xECED26633B5C2D7124B5eae794c9c32a8B8e7df2",
  },
};
// @note Here is total supply of NUT token
const MAX_SUPPLY = ethers.utils.parseEther("300000");
const ZEROADDRESS = '0x0000000000000000000000000000000000000000';
const startDistributingTimestamp = 1675861200;
const startTimestamp = 1675170000;
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
  const rawRewardsPerSecondArray: number[] = new Array(
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
  const RewardsPerSecondArray: BigNumber[] = new Array(TOTALAMOUNTOFMONTHS);
  RewardsPerSecondArray[0] = BigNumber.from(rawRewardsPerSecondArray[0]).mul(ethers.utils.parseEther("1")).div(100).div(ONEMONTH);
  startTimeOffset[0] = TIMEOFFSETBASE;
  // console.log(
  //   "set emission: ",
  //   startTimeOffset[0],
  //   RewardsPerSecondArray[0],
  //   WCFXXCFXRewardsPerSecond[0]
  // );
  for (let i = 1; i < startTimeOffset.length; i++) {
    startTimeOffset[i] = startTimeOffset[i - 1] + ONEMONTH;
    RewardsPerSecondArray[i] = BigNumber.from(rawRewardsPerSecondArray[i]).mul(ethers.utils.parseEther("1")).div(100).div(ONEMONTH);
    // console.log(
    //   "set emission: ",
    //   startTimeOffset[i],
    //   RewardsPerSecondArray[i],
    //   WCFXXCFXRewardsPerSecond[i]
    // );
  }
  let totalAmount = BigNumber.from(0);
  for (let i = 0; i < startTimeOffset.length; i++) {
    console.log(
      "set emission: ",
      startTimeOffset[i],
      RewardsPerSecondArray[i].toString()
    );
    totalAmount = totalAmount.add(RewardsPerSecondArray[i]);
  }
  totalAmount = totalAmount.mul(ONEMONTH);
  console.log("👉 Total amount: ", totalAmount.toString());
  if (addresses.MasterChefV2 !== "") {
    MasterChefV2 = await ethers.getContractAt("MasterChefV2", addresses.MasterChefV2, deployer);
    console.log("👉 Found NUTWCFX MasterChefV2 contract at:", MasterChefV2.address);
  }else{
    const masterChefV2Factory  = await ethers.getContractFactory("MasterChefV2", deployer);
    MasterChefV2 = await masterChefV2Factory.deploy(addresses.NUT, startTimestamp, startDistributingTimestamp, startTimeOffset, RewardsPerSecondArray, MAX_SUPPLY.mul(595).div(1000));
    await MasterChefV2.deployed();
    console.log("✅ Deployed MasterChefV2 at:", MasterChefV2.address);
    addresses.MasterChefV2 = MasterChefV2.address;
  }
  // Add all reward tokens into each pool
  let NUTTokenInterface = new ethers.Contract(addresses.NUT, ierc20.abi, deployer);
  let tx = await NUTTokenInterface.transfer(addresses.MasterChefV2, MAX_SUPPLY.mul(595).div(1000));
  await tx.wait();
  console.log("✅ Transferred to MasterChefV2:", tx.hash);
  // Add LP to each pool
  tx = await MasterChefV2.add(4, addresses.NUTWCFX, ZEROADDRESS);
  await tx.wait();
  console.log("✅ Added NUT/CFX LP to MasterChefV2:", tx.hash);
  tx = await MasterChefV2.add(6, addresses.XCFXWCFX, ZEROADDRESS);
  await tx.wait();
  console.log("✅ Added XCFX/CFX LP to MasterChefV2:", tx.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
