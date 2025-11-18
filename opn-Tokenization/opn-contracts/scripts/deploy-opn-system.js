// scripts/deploy-opn-system.js
//npx hardhat run scripts/deploy-opn-system.js --network opn
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying OPN Protocol (5-Contract System)");
  console.log("Network:", hre.network.name);
  console.log("=".repeat(70));
  
  const [deployer] = await ethers.getSigners();
  console.log("\n👤 Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "OPN");

  if (balance === 0n) {
    console.error("\n❌ ERROR: Insufficient balance!");
    console.error("Please fund your account with OPN tokens");
    console.error("Your address:", deployer.address);
    process.exit(1);
  }

  // Configuration
  const FEE_RECIPIENT = process.env.FEE_RECIPIENT || deployer.address;
  const ADMIN_WALLET = process.env.ADMIN_WALLET || "0xd715011858545620E23aC58dB8c9c1Be212A41E5";
  
  // USDC address - use mock for testing or real USDC
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x0000000000000000000000000000000000000001";
  
  console.log("\n⚙️  Configuration:");
  console.log("- Fee Recipient:", FEE_RECIPIENT);
  console.log("- Admin Wallet:", ADMIN_WALLET);
  console.log("- USDC Address:", USDC_ADDRESS);
  console.log("- Chain ID:", hre.network.config.chainId);
  
  const deployedContracts = {};
  const gasUsed = {};
  
  try {
    // =========================================================================
    // STEP 1: Deploy OPNAssetRegistry
    // =========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("📄 [1/5] Deploying OPNAssetRegistry...");
    console.log("=".repeat(70));
    
    const OPNAssetRegistry = await hre.ethers.getContractFactory("OPNAssetRegistry");
    console.log("⏳ Sending deployment transaction...");
    
    const assetRegistry = await OPNAssetRegistry.deploy(USDC_ADDRESS);
    await assetRegistry.waitForDeployment();
    
    const registryAddress = await assetRegistry.getAddress();
    deployedContracts.OPNAssetRegistry = registryAddress;
    
    console.log("✅ OPNAssetRegistry deployed to:", registryAddress);
    
    // Get gas used
    const registryTx = assetRegistry.deploymentTransaction();
    if (registryTx) {
      const receipt = await registryTx.wait(2);
      gasUsed.OPNAssetRegistry = receipt.gasUsed.toString();
      console.log("⛽ Gas used:", ethers.formatUnits(receipt.gasUsed, 0));
    }
    
    // =========================================================================
    // STEP 2: Deploy OPNPositionNFT
    // =========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("📄 [2/5] Deploying OPNPositionNFT...");
    console.log("=".repeat(70));
    
    const OPNPositionNFT = await hre.ethers.getContractFactory("OPNPositionNFT");
    console.log("⏳ Sending deployment transaction...");
    
    const positionNFT = await OPNPositionNFT.deploy(registryAddress, USDC_ADDRESS);
    await positionNFT.waitForDeployment();
    
    const positionNFTAddress = await positionNFT.getAddress();
    deployedContracts.OPNPositionNFT = positionNFTAddress;
    
    console.log("✅ OPNPositionNFT deployed to:", positionNFTAddress);
    
    const positionTx = positionNFT.deploymentTransaction();
    if (positionTx) {
      const receipt = await positionTx.wait(2);
      gasUsed.OPNPositionNFT = receipt.gasUsed.toString();
      console.log("⛽ Gas used:", ethers.formatUnits(receipt.gasUsed, 0));
    }
    
    // =========================================================================
    // STEP 3: Link Registry and PositionNFT
    // =========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("🔗 [3/5] Linking Registry ↔ PositionNFT...");
    console.log("=".repeat(70));
    
    console.log("⏳ Setting PositionNFT address in Registry...");
    const linkTx = await assetRegistry.setPositionNFTContract(positionNFTAddress);
    const linkReceipt = await linkTx.wait(2);
    console.log("✅ Contracts linked successfully!");
    console.log("⛽ Gas used:", ethers.formatUnits(linkReceipt.gasUsed, 0));
    
    // =========================================================================
    // STEP 4: Deploy OPNPrimaryMarket
    // =========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("📄 [4/5] Deploying OPNPrimaryMarket...");
    console.log("=".repeat(70));
    
    const OPNPrimaryMarket = await hre.ethers.getContractFactory("OPNPrimaryMarket");
    console.log("⏳ Sending deployment transaction...");
    
    const primaryMarket = await OPNPrimaryMarket.deploy(
      registryAddress,
      positionNFTAddress,
      FEE_RECIPIENT
    );
    await primaryMarket.waitForDeployment();
    
    const primaryMarketAddress = await primaryMarket.getAddress();
    deployedContracts.OPNPrimaryMarket = primaryMarketAddress;
    
    console.log("✅ OPNPrimaryMarket deployed to:", primaryMarketAddress);
    
    const primaryTx = primaryMarket.deploymentTransaction();
    if (primaryTx) {
      const receipt = await primaryTx.wait(2);
      gasUsed.OPNPrimaryMarket = receipt.gasUsed.toString();
      console.log("⛽ Gas used:", ethers.formatUnits(receipt.gasUsed, 0));
    }
    
    // Grant MINTER_ROLE to PrimaryMarket
    console.log("🔐 Granting MINTER_ROLE to PrimaryMarket...");
    const MINTER_ROLE = await positionNFT.MINTER_ROLE();
    const grantMinterTx1 = await positionNFT.grantRole(MINTER_ROLE, primaryMarketAddress);
    await grantMinterTx1.wait(2);
    console.log("✅ MINTER_ROLE granted to PrimaryMarket");
    
    // =========================================================================
    // STEP 5: Deploy OPNSecondaryMarket
    // =========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("📄 [5/5] Deploying OPNSecondaryMarket...");
    console.log("=".repeat(70));
    
    const OPNSecondaryMarket = await hre.ethers.getContractFactory("OPNSecondaryMarket");
    console.log("⏳ Sending deployment transaction...");
    
    const secondaryMarket = await OPNSecondaryMarket.deploy(
      positionNFTAddress,
      registryAddress,
      FEE_RECIPIENT
    );
    await secondaryMarket.waitForDeployment();
    
    const secondaryMarketAddress = await secondaryMarket.getAddress();
    deployedContracts.OPNSecondaryMarket = secondaryMarketAddress;
    
    console.log("✅ OPNSecondaryMarket deployed to:", secondaryMarketAddress);
    
    const secondaryTx = secondaryMarket.deploymentTransaction();
    if (secondaryTx) {
      const receipt = await secondaryTx.wait(2);
      gasUsed.OPNSecondaryMarket = receipt.gasUsed.toString();
      console.log("⛽ Gas used:", ethers.formatUnits(receipt.gasUsed, 0));
    }
    
    // Grant MINTER_ROLE to SecondaryMarket
    console.log("🔐 Granting MINTER_ROLE to SecondaryMarket...");
    const grantMinterTx2 = await positionNFT.grantRole(MINTER_ROLE, secondaryMarketAddress);
    await grantMinterTx2.wait(2);
    console.log("✅ MINTER_ROLE granted to SecondaryMarket");
    
    // =========================================================================
    // STEP 6: Deploy OPNGovernance
    // =========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("📄 [6/6] Deploying OPNGovernance...");
    console.log("=".repeat(70));
    
    const OPNGovernance = await hre.ethers.getContractFactory("OPNGovernance");
    console.log("⏳ Sending deployment transaction...");
    
    const governance = await OPNGovernance.deploy(
      positionNFTAddress,
      registryAddress
    );
    await governance.waitForDeployment();
    
    const governanceAddress = await governance.getAddress();
    deployedContracts.OPNGovernance = governanceAddress;
    
    console.log("✅ OPNGovernance deployed to:", governanceAddress);
    
    const govTx = governance.deploymentTransaction();
    if (govTx) {
      const receipt = await govTx.wait(2);
      gasUsed.OPNGovernance = receipt.gasUsed.toString();
      console.log("⛽ Gas used:", ethers.formatUnits(receipt.gasUsed, 0));
    }
    
    // =========================================================================
    // STEP 7: Setup Admin Roles
    // =========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("🔐 Setting up admin roles...");
    console.log("=".repeat(70));
    
    // Add admin to registry if different from deployer
    if (ADMIN_WALLET.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("Adding admin to AssetRegistry:", ADMIN_WALLET);
      try {
        const addAdminTx = await assetRegistry.addAdmin(ADMIN_WALLET);
        await addAdminTx.wait(2);
        console.log("✅ Admin added to AssetRegistry");
      } catch (error) {
        console.log("⚠️  Admin might already exist:", error.message);
      }
    } else {
      console.log("✅ Deployer is already admin");
    }
    
    console.log("✅ All admin roles configured!");
    
    // =========================================================================
    // STEP 8: Save Deployment Info
    // =========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("💾 Saving deployment information...");
    console.log("=".repeat(70));
    
    const deploymentInfo = {
      network: hre.network.name,
      chainId: hre.network.config.chainId || 984,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      blockNumber: await ethers.provider.getBlockNumber(),
      contracts: deployedContracts,
      gasUsed: gasUsed,
      configuration: {
        usdcAddress: USDC_ADDRESS,
        feeRecipient: FEE_RECIPIENT,
        adminWallet: ADMIN_WALLET,
        platformFee: "250", // 2.5%
        marketplaceFee: "200", // 2%
        approvalThreshold: "5100", // 51%
        minVotingPeriod: "1 day",
        maxVotingPeriod: "30 days"
      },
      version: "1.0.0"
    };

    // Create deployments directory
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save deployment info
    const filename = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));

    console.log("✅ Deployment info saved to:", filename);
    
    // =========================================================================
    // DEPLOYMENT SUMMARY
    // =========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(70));
    
    console.log("\n📋 DEPLOYED CONTRACTS:");
    console.log("-".repeat(70));
    Object.entries(deployedContracts).forEach(([name, address]) => {
      console.log(`${name.padEnd(25)} ${address}`);
    });
    
    console.log("\n⛽ TOTAL GAS USED:");
    console.log("-".repeat(70));
    let totalGas = BigInt(0);
    Object.entries(gasUsed).forEach(([name, gas]) => {
      console.log(`${name.padEnd(25)} ${gas}`);
      totalGas += BigInt(gas);
    });
    console.log("-".repeat(70));
    console.log(`${"TOTAL".padEnd(25)} ${totalGas.toString()}`);
    
    console.log("\n📝 UPDATE YOUR .ENV FILE:");
    console.log("-".repeat(70));
    console.log("# Add these to your frontend .env file:");
    console.log(`VITE_ASSET_REGISTRY=${deployedContracts.OPNAssetRegistry}`);
    console.log(`VITE_POSITION_NFT=${deployedContracts.OPNPositionNFT}`);
    console.log(`VITE_PRIMARY_MARKET=${deployedContracts.OPNPrimaryMarket}`);
    console.log(`VITE_SECONDARY_MARKET=${deployedContracts.OPNSecondaryMarket}`);
    console.log(`VITE_GOVERNANCE=${deployedContracts.OPNGovernance}`);
    console.log(`VITE_CHAIN_ID=984`);
    
    console.log("\n🔗 EXPLORER LINKS:");
    console.log("-".repeat(70));
    const explorerBase = "https://explorer.cor3innovations.io/address/";
    Object.entries(deployedContracts).forEach(([name, address]) => {
      console.log(`${name}:`);
      console.log(`${explorerBase}${address}\n`);
    });
    
    console.log("✅ System is ready for testing!");
    console.log("=".repeat(70));
    
  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED:");
    console.error(error);
    
    if (error.message.includes("insufficient funds")) {
      console.error("\n💡 TIP: Make sure your deployer wallet has enough OPN for gas");
      console.error("Your address:", deployer.address);
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });