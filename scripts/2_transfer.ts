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
    nucleon_token: string;
    systemdistribute: string;
    systemdistributeAdmin: string;
    masterChefV2: string;
    team_70: string;
    team_30: string;
    marketing: string;
    treasury: string;
    DAO: string;
  };
} = {
  testnet: {
    nucleon_token: "0x1e9890180DC264670BC086ac2084bB3B700fb051",
    systemdistribute: "0x1455c1081AC835Ce4EF1989C11A3afC811928347",
    systemdistributeAdmin: "0xad085E56F5673FD994453bbCdfe6828aa659Cb0d",
    masterChefV2: "0x3e45741f0c46Cad7AA1834e31F3bD739555d4760",
    team_70: "0x1a735B9F3555d2f121999C1C1C6057e0afF1a4F9",
    team_30: "0x1a735B9F3555d2f121999C1C1C6057e0afF1a4F9",
    marketing: "0xe0493ddccfbc2c656ccafe8518dc631a76888ef8", //multisig for testing
    treasury: "0xad085E56F5673FD994453bbCdfe6828aa659Cb0d",
    DAO: "0x23A84653C261E584428a712144a0a4a77628dB20",
  },
  espace: {
    nucleon_token: "0xFE197E7968807B311D476915DB585831B43A7E3b",
    systemdistribute: "0xA18936C68BDe988F1B0CB6a45311b6Af0f55f4a7",
    systemdistributeAdmin: "0x8BB89e5b2D8c8A17aB5c2c3148dF86297A2Fd05B",
    masterChefV2: "0xECED26633B5C2D7124B5eae794c9c32a8B8e7df2",
    team_70: "0x5FDddEF203f70c971b70e65Ad1db38acDCF151ad",
    team_30: "0x3cc2318A880A961c6859e42aB438b68AEcd15d0b",
    marketing: "0xea41549df7196805cd9bb30e790e86389f4c13af",
    treasury: "0xbeb910ae81e3dd1622633660d47443ae37894f75",
    DAO: "0xdfbf3c11024023262a3f41cf33175357a136ddb0",
  },
};
// @note Here is total supply of NUT token
const MAX_SUPPLY = ethers.utils.parseEther("300000");
const ZEROADDRESS = '0x0000000000000000000000000000000000000000';
const TOTALAMOUNT_masterChefV2 = ethers.utils.parseEther("178500");//@note deployer sent it once deployed NUT
const AMOUNT_team_70 = ethers.utils.parseEther("30000").mul(7).div(10).div(48);
const AMOUNT_team_30 = ethers.utils.parseEther("30000").mul(3).div(10).div(48);
const AMOUNT_marketing = ethers.utils.parseEther("30000").div(48);
const AMOUNT_treasury = ethers.utils.parseEther("30000").div(48);
const AMOUNT_DAO = ethers.utils.parseEther("27000").div(48);
const TOTALAMOUNT_systemdistribute = ethers.utils.parseEther("117000");
let Nucleon_token: Nucleon_token;
let Systemdistribute: Systemdistribute;
let mockToken = require(`../test/PPIToken.sol/PPIToken.json`);
let ierc20 = require(`../test/IERC20.sol/IERC20.json`);
async function main() {
  const [deployer] = await ethers.getSigners();
  const addresses = ADDRESSES[network.name];
  let amount_array = [AMOUNT_team_70, AMOUNT_team_30, AMOUNT_marketing, AMOUNT_marketing, AMOUNT_treasury, AMOUNT_DAO];
  let distributed_array = [addresses.team_70, addresses.team_30, addresses.marketing, addresses.treasury, addresses.DAO];
  if (addresses.nucleon_token !== "") {
    Nucleon_token = await ethers.getContractAt("nucleon_token", addresses.nucleon_token, deployer);
    console.log("👉 Found Nucleon_token contract at:", Nucleon_token.address);
  }else{
    const Nucleon_tokenFactory  = await ethers.getContractFactory("nucleon_token", deployer);
    Nucleon_token = await Nucleon_tokenFactory.deploy();
    await Nucleon_token.deployed();
    console.log("✅ Deployed Nucleon_token at:", Nucleon_token.address);
    addresses.nucleon_token = Nucleon_token.address;
  }
  var balance = await Nucleon_token.balanceOf(deployer.address);
  console.log("👉 Owner balance", balance.toString());
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
  var tx = await Systemdistribute.transferERC20byAmount(addresses.nucleon_token);
  await tx.wait();
  console.log("✅ transferERC20byAmount:", tx.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
