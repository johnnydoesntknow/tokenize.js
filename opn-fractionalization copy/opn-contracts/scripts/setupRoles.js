// scripts/setupRoles.js
const hre = require("hardhat");

async function main() {
  console.log("🔐 Checking and Setting Up Contract Roles...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer/Owner address:", deployer.address);
  
  // Contract addresses from deployment
  const KYC_ADDRESS = "0x7d6de0Ab2b00875a6CEf64B4350c86A6F1e779CC";
  const FRACTIONALIZATION_ADDRESS = "0xE63c3D97e3cab05Ff717491A757Eb37b77Ee086d";
  
  // Get contract instances
  const KYCRegistry = await ethers.getContractFactory("KYCRegistry");
  const kyc = KYCRegistry.attach(KYC_ADDRESS);
  
  const OPNFractionalization = await ethers.getContractFactory("OPNFractionalization");
  const fractionalization = OPNFractionalization.attach(FRACTIONALIZATION_ADDRESS);
  
  console.log("\n📋 FRACTIONALIZATION CONTRACT ROLES:");
  console.log("=====================================");
  
  // Check all roles for fractionalization contract
  const DEFAULT_ADMIN_ROLE = await fractionalization.DEFAULT_ADMIN_ROLE();
  const ADMIN_ROLE = await fractionalization.ADMIN_ROLE();
  const COMPLIANCE_ROLE = await fractionalization.COMPLIANCE_ROLE();
  
  // Check if deployer has each role
  const hasDefaultAdmin = await fractionalization.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  const hasAdmin = await fractionalization.hasRole(ADMIN_ROLE, deployer.address);
  const hasCompliance = await fractionalization.hasRole(COMPLIANCE_ROLE, deployer.address);
  
  console.log("DEFAULT_ADMIN_ROLE:", hasDefaultAdmin ? "✅ YES" : "❌ NO");
  console.log("ADMIN_ROLE:", hasAdmin ? "✅ YES" : "❌ NO");
  console.log("COMPLIANCE_ROLE:", hasCompliance ? "✅ YES" : "❌ NO");
  
  // Grant compliance role if needed
  if (!hasCompliance) {
    console.log("\n⚠️  Deployer doesn't have COMPLIANCE_ROLE. Granting...");
    const tx1 = await fractionalization.grantRole(COMPLIANCE_ROLE, deployer.address);
    await tx1.wait();
    console.log("✅ COMPLIANCE_ROLE granted to deployer!");
  }
  
  console.log("\n📋 KYC REGISTRY ROLES:");
  console.log("=======================");
  
  // Check KYC registry roles
  const KYC_DEFAULT_ADMIN = await kyc.DEFAULT_ADMIN_ROLE();
  const KYC_ADMIN_ROLE = await kyc.ADMIN_ROLE();
  const KYC_VERIFIER_ROLE = await kyc.KYC_VERIFIER_ROLE();
  
  const hasKycDefaultAdmin = await kyc.hasRole(KYC_DEFAULT_ADMIN, deployer.address);
  const hasKycAdmin = await kyc.hasRole(KYC_ADMIN_ROLE, deployer.address);
  const hasKycVerifier = await kyc.hasRole(KYC_VERIFIER_ROLE, deployer.address);
  
  console.log("DEFAULT_ADMIN_ROLE:", hasKycDefaultAdmin ? "✅ YES" : "❌ NO");
  console.log("ADMIN_ROLE:", hasKycAdmin ? "✅ YES" : "❌ NO");
  console.log("KYC_VERIFIER_ROLE:", hasKycVerifier ? "✅ YES" : "❌ NO");
  
  // Grant KYC verifier role if needed
  if (!hasKycVerifier) {
    console.log("\n⚠️  Deployer doesn't have KYC_VERIFIER_ROLE. Granting...");
    const tx2 = await kyc.grantRole(KYC_VERIFIER_ROLE, deployer.address);
    await tx2.wait();
    console.log("✅ KYC_VERIFIER_ROLE granted to deployer!");
  }
  
  // Check other compliance officers
  console.log("\n📋 OTHER ROLE HOLDERS:");
  console.log("======================");
  
  // You can add specific addresses to check here
  const addressesToCheck = [
    // Add any other addresses you want to check/grant roles to
    // "0x...",
  ];
  
  for (const addr of addressesToCheck) {
    console.log(`\nChecking ${addr}:`);
    const hasComp = await fractionalization.hasRole(COMPLIANCE_ROLE, addr);
    const hasKyc = await kyc.hasRole(KYC_VERIFIER_ROLE, addr);
    console.log("- Compliance Role:", hasComp ? "✅" : "❌");
    console.log("- KYC Verifier Role:", hasKyc ? "✅" : "❌");
  }
  
  // Summary
  console.log("\n✅ ROLE SETUP COMPLETE!");
  console.log("========================");
  console.log("The deployer now has:");
  console.log("- Full admin rights on both contracts");
  console.log("- Compliance officer role (can approve/reject fractionalization requests)");
  console.log("- KYC verifier role (can verify user KYC)");
  console.log("\nYou can now:");
  console.log("1. See the Compliance tab in the UI");
  console.log("2. Approve/reject fractionalization requests");
  console.log("3. Verify user KYC applications");
}

// Additional function to grant roles to other addresses
async function grantRolesToAddress(address) {
  const FRACTIONALIZATION_ADDRESS = "0xE63c3D97e3cab05Ff717491A757Eb37b77Ee086d";
  const KYC_ADDRESS = "0x7d6de0Ab2b00875a6CEf64B4350c86A6F1e779CC";
  
  const OPNFractionalization = await ethers.getContractFactory("OPNFractionalization");
  const fractionalization = OPNFractionalization.attach(FRACTIONALIZATION_ADDRESS);
  
  const KYCRegistry = await ethers.getContractFactory("KYCRegistry");
  const kyc = KYCRegistry.attach(KYC_ADDRESS);
  
  const COMPLIANCE_ROLE = await fractionalization.COMPLIANCE_ROLE();
  const KYC_VERIFIER_ROLE = await kyc.KYC_VERIFIER_ROLE();
  
  console.log(`\nGranting roles to ${address}...`);
  
  const tx1 = await fractionalization.grantRole(COMPLIANCE_ROLE, address);
  await tx1.wait();
  console.log("✅ COMPLIANCE_ROLE granted");
  
  const tx2 = await kyc.grantRole(KYC_VERIFIER_ROLE, address);
  await tx2.wait();
  console.log("✅ KYC_VERIFIER_ROLE granted");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });