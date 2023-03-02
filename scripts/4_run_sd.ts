import { BigNumber, constants } from "ethers";
import { ethers, network } from "hardhat";
import {
  Nucleon_token,
  Systemdistribute
} from "../typechain-types";
import * as fs from 'fs';
import { string } from "hardhat/internal/core/params/argumentTypes";
const ADDRESSES: {
  [network: string]: {
    systemdistribute: string;
    systemdistributeAdmin: string;
    team: string;
    marketing: string;
    IDO: string;
  };
} = {
  testnet: {
    systemdistribute: "0x1455c1081AC835Ce4EF1989C11A3afC811928347",
    systemdistributeAdmin: "0xad085E56F5673FD994453bbCdfe6828aa659Cb0d",
    team: "0x1a735B9F3555d2f121999C1C1C6057e0afF1a4F9",
    marketing: "0xe0493ddccfbc2c656ccafe8518dc631a76888ef8", //multisig for testing
    IDO: "0x23A84653C261E584428a712144a0a4a77628dB20",
  },
  espace: {
    systemdistribute: "0xe97331a4F26615b7697480F88A0cE5e40E395bbd",
    systemdistributeAdmin: "0xd55a4ecb047a5738fcf2996ec37230485376326c",
    team: "0x645Ba643625983700793931eA54cba873A321c30",
    marketing: "0x8f166C625B37B81627546cCF3D02A9caf0176Df6",
    IDO: "0xe48bfBE83dADEdda294f43eF387dd6c72f1fD3cE",
  },
};
// @note Here is total supply of NUT token
const MAX_SUPPLY = ethers.utils.parseEther("300000");
const ZEROADDRESS = '0x0000000000000000000000000000000000000000';
// const TOTALAMOUNT_masterChefV2 = ethers.utils.parseEther("178500");
const AMOUNT_team = ethers.utils.parseEther("1250000");
const AMOUNT_marketing = ethers.utils.parseEther("1166666");
const AMOUNT_IDO = ethers.utils.parseEther("333332");

let Systemdistribute: Systemdistribute;
let mockToken = require(`../test/PPIToken.sol/PPIToken.json`);
let ierc20 = require(`../test/IERC20.sol/IERC20.json`);
async function main() {
  const [deployer] = await ethers.getSigners();
  const addresses = ADDRESSES[network.name];
  let amount_array = [AMOUNT_team, AMOUNT_marketing, AMOUNT_IDO];
  let distributed_array = [addresses.team, addresses.marketing, addresses.IDO];
  if (addresses.systemdistribute !== "") {
    Systemdistribute = await ethers.getContractAt("systemdistribute", addresses.systemdistribute, deployer);
    console.log("👉 Found Systemdistribute contract at:", Systemdistribute.address);
  }else{
    const SystemdistributeFactory  = await ethers.getContractFactory("systemdistribute", deployer);
    // getting timestamp
    var blockNumBefore = await ethers.provider.getBlockNumber();
    var blockBefore = await ethers.provider.getBlock(blockNumBefore);
    var timestampBefore = blockBefore.timestamp;
    Systemdistribute = await SystemdistributeFactory.deploy(timestampBefore - TRANSFERINTERVAL);
    await Systemdistribute.deployed();
    console.log("✅ Deployed Systemdistribute at:", Systemdistribute.address);
    addresses.systemdistribute = Systemdistribute.address;
  }
  // transfer to masterchef @note Already transferred no need to do it
  // var tx = await Nucleon_token.transfer(addresses.masterChefV2, TOTALAMOUNT_masterChefV2);
  // await tx.wait();
  // console.log("✅ transfer to masterChefV2:", tx.hash);
  // var balance = await Nucleon_token.balanceOf(addresses.masterChefV2);
  // console.log("👉 masterChefV2 balance", balance.toString());

  // transfer systemds
  // var tx = await Nucleon_token.transfer(addresses.systemdistribute, TOTALAMOUNT_systemdistribute);
  // await tx.wait();
  // console.log("✅ transfer to systemdistribute:", tx.hash);
  // var balance = await Nucleon_token.balanceOf(addresses.systemdistribute);
  // console.log("👉 systemdistribute balance", balance.toString());

  var tx = await Systemdistribute._setAccounts(amount_array, distributed_array);
  await tx.wait();
  console.log("✅ _setAccounts:", tx.hash);
  var tx = await Systemdistribute._setAdmin(addresses.systemdistributeAdmin);
  await tx.wait();
  console.log("✅ _setAdmin:", tx.hash);
  var tx = await Systemdistribute._setallow(1080);
  await tx.wait();
  console.log("✅ _setallow to 1080:", tx.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
