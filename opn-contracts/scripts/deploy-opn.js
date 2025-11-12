// opn-contracts/scripts/deploy-opn.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment to SAGE Network (OPN)");
  console.log("Network:", hre.network.name);
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "OPN");

  // Check if we have enough balance for deployment
  if (balance === 0n) {
    console.error("❌ Insufficient balance. Please fund your account with OPN tokens.");
    process.exit(1);
  }

  console.log("\n📄 Deploying OPNTokenization (No KYC Required)...");
  const OPNTokenization = await hre.ethers.getContractFactory("OPNTokenization");
  
  // Configuration for OPN platform
  const BASE_URI = "https://api.opn-tokenization.com/metadata/";
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  
  // Deploy simplified contract (no KYC registry parameter)
  const tokenization = await OPNTokenization.deploy(
    BASE_URI,
    feeRecipient
  );
  
  await tokenization.waitForDeployment();
  const tokenizationAddress = await tokenization.getAddress();
  console.log("✅ OPNTokenization deployed to:", tokenizationAddress);

  // Wait for confirmations
  const deployTx = tokenization.deploymentTransaction();
  if (deployTx) {
    console.log("⏳ Waiting for confirmations...");
    await deployTx.wait(5);
  }

  // Setup admin roles
  console.log("\n🔐 Setting up admin roles...");
  const ADMIN_ROLE = await tokenization.ADMIN_ROLE();
  
  // Your admin wallet is already added in constructor
  console.log("✅ Admin wallet (0xd715...41E5) already configured in contract");
  
  // Add additional admins if specified in env
  if (process.env.ADDITIONAL_ADMIN) {
    const tx = await tokenization.grantRole(ADMIN_ROLE, process.env.ADDITIONAL_ADMIN);
    await tx.wait();
    console.log("✅ Granted ADMIN_ROLE to:", process.env.ADDITIONAL_ADMIN);
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId || 403,
    contracts: {
      OPNTokenization: tokenizationAddress
    },
    configuration: {
      baseURI: BASE_URI,
      feeRecipient: feeRecipient,
      platformFee: "250", // 2.5%
      adminWallet: "0xd715011858545620E23aC58dB8c9c1Be212A41E5"
    },
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString()
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  // Save deployment info
  const filename = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n✅ Deployment completed successfully!");
  console.log("📁 Deployment info saved to:", filename);
  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n📝 IMPORTANT - Update your frontend .env file:");
  console.log(`VITE_TOKENIZATION_CONTRACT=${tokenizationAddress}`);
  console.log("\n🔗 View on Explorer:");
  console.log(`https://explorer.cor3innovations.io/address/${tokenizationAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });