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
    XCFXNUT: string;
  };
} = {
  testnet: {
    NUTWCFX: "",
    XCFXWCFX: "",
    NUT: "",
    MasterChefV2: "",
    XCFXNUT: ""
  },
  espace: {
    NUTWCFX: "0xd9d5748CB36a81FE58F91844F4A0412502FD3105",
    XCFXWCFX: "0x949b78eF2c8d6979098E195b08F27FF99cb20448",
    NUT: "0xFE197E7968807B311D476915DB585831B43A7E3b",
    MasterChefV2: "0xECED26633B5C2D7124B5eae794c9c32a8B8e7df2",
    XCFXNUT: "0x2899E1beC55E7DDA574e80E8EF55F17b79Df2f1d"
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
  if (addresses.MasterChefV2 !== "") {
    MasterChefV2 = await ethers.getContractAt("MasterChefV2", addresses.MasterChefV2, deployer);
    console.log("👉 Found NUTWCFX MasterChefV2 contract at:", MasterChefV2.address);
  }else{
    return;
  }
  // Add LP to each pool
  let tx = await MasterChefV2.add(4, addresses.XCFXNUT, ZEROADDRESS);
  await tx.wait();
  console.log("✅ Added XCFX/NUT LP to MasterChefV2:", tx.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
