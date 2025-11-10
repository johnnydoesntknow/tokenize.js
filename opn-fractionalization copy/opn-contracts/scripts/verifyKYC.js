// scripts/verifyWallet.js
const hre = require("hardhat");

async function main() {
  // Get the wallet address to verify from command line or use a default
  const addressToVerify = process.env.VERIFY_ADDRESS || null;
  
  if (!addressToVerify) {
    console.error("❌ Please provide a wallet address to verify!");
    console.error("Usage: VERIFY_ADDRESS=0x... yarn hardhat run scripts/verifyWallet.js --network opn");
    process.exit(1);
  }

  console.log("🔐 Verifying KYC for wallet:", addressToVerify);
  
  const [deployer] = await ethers.getSigners();
  console.log("Using deployer account:", deployer.address);
  
  // Contract address from deployment
  const KYC_ADDRESS = "0x7d6de0Ab2b00875a6CEf64B4350c86A6F1e779CC";
  
  // Get contract instance
  const KYCRegistry = await ethers.getContractFactory("KYCRegistry");
  const kyc = KYCRegistry.attach(KYC_ADDRESS);
  
  // Check if deployer has KYC_VERIFIER_ROLE
  const KYC_VERIFIER_ROLE = await kyc.KYC_VERIFIER_ROLE();
  const hasRole = await kyc.hasRole(KYC_VERIFIER_ROLE, deployer.address);
  
  if (!hasRole) {
    console.log("⚠️  Deployer doesn't have KYC_VERIFIER_ROLE. Granting role...");
    const grantTx = await kyc.grantRole(KYC_VERIFIER_ROLE, deployer.address);
    await grantTx.wait();
    console.log("✅ KYC_VERIFIER_ROLE granted to deployer");
  }
  
  // Check current KYC status
  const isVerifiedBefore = await kyc.isVerified(addressToVerify);
  console.log("\nCurrent KYC status:", isVerifiedBefore);
  
  if (!isVerifiedBefore) {
    console.log("\n📝 Verifying KYC...");
    
    // Verify KYC for the specified address
    const tx = await kyc.verifyKYC(
      addressToVerify,
      "QmKYCDocument" + Date.now(), // Unique document hash
      0 // Use default validity period (365 days)
    );
    
    await tx.wait();
    console.log("✅ KYC verification transaction confirmed!");
    
    // Check status again
    const isVerifiedAfter = await kyc.isVerified(addressToVerify);
    console.log("New KYC status:", isVerifiedAfter);
  } else {
    console.log("✅ Wallet is already KYC verified!");
  }
  
  // Show KYC details
  try {
    const kycData = await kyc.getUserKYCData(addressToVerify);
    console.log("\n📋 KYC Details:");
    console.log("- Verified:", kycData.verified);
    console.log("- Verification Date:", new Date(Number(kycData.verificationDate) * 1000).toLocaleString());
    console.log("- Expiry Date:", new Date(Number(kycData.expiryDate) * 1000).toLocaleString());
    console.log("- Verified By:", kycData.verifiedBy);
    console.log("- Document Hash:", kycData.documentHash);
  } catch (error) {
    console.log("Could not fetch detailed KYC data");
  }
  
  console.log("\n✅ Wallet", addressToVerify, "can now create fractionalization requests!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });