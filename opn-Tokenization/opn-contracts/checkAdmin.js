const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const provider = new ethers.providers.JsonRpcProvider("https://rpc.cor3innovations.io/");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log("Checking wallet:", wallet.address);
  
  const abi = [
    "function grantRole(bytes32 role, address account)",
    "function ADMIN_ROLE() view returns (bytes32)",
    "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function getRoleAdmin(bytes32 role) view returns (bytes32)"
  ];
  
  const contract = new ethers.Contract(
    "0x3F4554c525F072FDb99d3affF3C71a764F482c93",
    abi,
    wallet
  );
  
  // Check both roles
  const ADMIN_ROLE = await contract.ADMIN_ROLE();
  const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
  
  const hasAdmin = await contract.hasRole(ADMIN_ROLE, wallet.address);
  const hasDefault = await contract.hasRole(DEFAULT_ADMIN_ROLE, wallet.address);
  
  console.log("Has ADMIN_ROLE:", hasAdmin);
  console.log("Has DEFAULT_ADMIN_ROLE:", hasDefault);
  
  if (!hasAdmin) {
    console.log("\n❌ You don't have ADMIN_ROLE!");
    
    if (hasDefault) {
      console.log("✅ But you have DEFAULT_ADMIN_ROLE, so granting ADMIN_ROLE...");
      const tx = await contract.grantRole(ADMIN_ROLE, wallet.address);
      console.log("Transaction:", tx.hash);
      await tx.wait();
      console.log("✅ ADMIN_ROLE granted successfully!");
    } else {
      console.log("❌ You also don't have DEFAULT_ADMIN_ROLE. This shouldn't happen!");
      console.log("The contract may not have been deployed with this wallet.");
    }
  } else {
    console.log("✅ You already have ADMIN_ROLE!");
  }
}

main().catch(console.error);