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
    nucleon_token: "",
    systemdistribute: "",
    systemdistributeAdmin: "",
    masterChefV2: "",
    team_70: "",
    team_30: "",
    marketing: "",
    treasury: "",
    DAO: "",
  },
  espace: {
    nucleon_token: "",
    systemdistribute: "",
    systemdistributeAdmin: "",
    masterChefV2: "",
    team_70: "",
    team_30: "",
    marketing: "",
    treasury: "",
    DAO: "",
  },
};
// @note Here is total supply of NUT token
const MAX_SUPPLY = ethers.utils.parseEther("300000");
const ZEROADDRESS = '0x0000000000000000000000000000000000000000';
const TRANSFERINTERVAL = 2592000;//86,400 1 days;2,592,000 30 days
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
  if (addresses.systemdistribute !== "") {
    Systemdistribute = await ethers.getContractAt("systemdistribute", addresses.systemdistribute, deployer);
    console.log("👉 Found Systemdistribute contract at:", Systemdistribute.address);
  }else{
    const SystemdistributeFactory  = await ethers.getContractFactory("systemdistribute", deployer);
    // getting timestamp
    // var blockNumBefore = await ethers.provider.getBlockNumber();
    // var blockBefore = await ethers.provider.getBlock(blockNumBefore);
    var timestampBefore = 1677646800;
    Systemdistribute = await SystemdistributeFactory.deploy(timestampBefore - TRANSFERINTERVAL);
    await Systemdistribute.deployed();
    console.log("✅ Deployed Systemdistribute at:", Systemdistribute.address);
    addresses.systemdistribute = Systemdistribute.address;
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
