const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment to OPN Network");
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

  console.log("\n📄 Deploying KYCRegistry...");
  const KYCRegistry = await hre.ethers.getContractFactory("KYCRegistry");
  const kycRegistry = await KYCRegistry.deploy();
  await kycRegistry.waitForDeployment();
  const kycRegistryAddress = await kycRegistry.getAddress();
  console.log("✅ KYCRegistry deployed to:", kycRegistryAddress);

  // Wait for confirmations
  const kycDeployTx = kycRegistry.deploymentTransaction();
  if (kycDeployTx) {
    await kycDeployTx.wait(5);
    console.log("⏳ Waiting for confirmations...");
  }

  console.log("\n📄 Deploying OPNFractionalization...");
  const OPNFractionalization = await hre.ethers.getContractFactory("OPNFractionalization");
  
  // Configuration for OPN platform
  const BASE_URI = "https://api.opn-fractionalization.com/metadata/";
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  
  const fractionalization = await OPNFractionalization.deploy(
    BASE_URI,
    kycRegistryAddress,
    feeRecipient
  );
  await fractionalization.waitForDeployment();
  const fractionalizationAddress = await fractionalization.getAddress();
  console.log("✅ OPNFractionalization deployed to:", fractionalizationAddress);

  // Wait for confirmations
  const fracDeployTx = fractionalization.deploymentTransaction();
  if (fracDeployTx) {
    await fracDeployTx.wait(5);
  }

  // Setup initial roles
  console.log("\n🔐 Setting up roles...");
  const COMPLIANCE_ROLE = await fractionalization.COMPLIANCE_ROLE();
  const KYC_VERIFIER_ROLE = await kycRegistry.KYC_VERIFIER_ROLE();

  // Grant roles if needed
  if (process.env.COMPLIANCE_OFFICER) {
    const tx1 = await fractionalization.grantRole(COMPLIANCE_ROLE, process.env.COMPLIANCE_OFFICER);
    await tx1.wait();
    console.log("✅ Granted COMPLIANCE_ROLE to:", process.env.COMPLIANCE_OFFICER);
  }

  if (process.env.KYC_VERIFIER) {
    const tx2 = await kycRegistry.grantRole(KYC_VERIFIER_ROLE, process.env.KYC_VERIFIER);
    await tx2.wait();
    console.log("✅ Granted KYC_VERIFIER_ROLE to:", process.env.KYC_VERIFIER);
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contracts: {
      KYCRegistry: kycRegistryAddress,
      OPNFractionalization: fractionalizationAddress
    },
    configuration: {
      baseURI: BASE_URI,
      feeRecipient: feeRecipient,
      platformFee: "250" // 2.5%
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

  // Verify contracts if explorer API is available
  if (process.env.OPN_EXPLORER_API_KEY && hre.network.name !== "localhost") {
    console.log("\n🔍 Verifying contracts on OPN Explorer...");
    try {
      await hre.run("verify:verify", {
        address: kycRegistryAddress,
        constructorArguments: [],
      });
      console.log("✅ KYCRegistry verified");

      await hre.run("verify:verify", {
        address: fractionalizationAddress,
        constructorArguments: [BASE_URI, kycRegistryAddress, feeRecipient],
      });
      console.log("✅ OPNFractionalization verified");
    } catch (error) {
      console.log("⚠️  Contract verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });