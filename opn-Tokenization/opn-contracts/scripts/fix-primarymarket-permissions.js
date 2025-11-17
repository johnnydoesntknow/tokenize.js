// scripts/fix-primarymarket-permissions.js
// Hardhat script to grant PrimaryMarket permission to call recordSale() in AssetRegistry
//npx hardhat run scripts/fix-primarymarket-permissions.js --network opn

async function main() {
  console.log("================================================================================");
  console.log("   FIXING PRIMARYMARKET PERMISSIONS");
  console.log("================================================================================\n");

  const [signer] = await ethers.getSigners();
  
  console.log("Using wallet:", signer.address);
  console.log("");

  // ============================================================================
  // YOUR DEPLOYED CONTRACT ADDRESSES
  // ============================================================================
  
  const ASSET_REGISTRY = "0x404a5E32880f83f20b7DCED10C55233249a821f9";
  const PRIMARY_MARKET = "0xcEee24FF0fc7a3303FC40D404426D54C8EB9B34b";

  console.log("Contract Addresses:");
  console.log("  AssetRegistry:", ASSET_REGISTRY);
  console.log("  PrimaryMarket:", PRIMARY_MARKET);
  console.log("");

  // ============================================================================
  // Connect to AssetRegistry
  // ============================================================================
  
  const assetRegistry = await ethers.getContractAt("OPNAssetRegistry", ASSET_REGISTRY);
  
  // Get ADMIN_ROLE
  const ADMIN_ROLE = await assetRegistry.ADMIN_ROLE();
  console.log("ADMIN_ROLE hash:", ADMIN_ROLE);
  console.log("");

  // ============================================================================
  // Check Current Permissions
  // ============================================================================
  
  console.log("Checking current permissions...");
  const hasRole = await assetRegistry.hasRole(ADMIN_ROLE, PRIMARY_MARKET);
  
  console.log("  PrimaryMarket has ADMIN_ROLE:", hasRole ? "✅" : "❌");
  console.log("");

  if (hasRole) {
    console.log("✅ PrimaryMarket already has ADMIN_ROLE!");
    console.log("✅ Permissions are correct - PrimaryMarket can call recordSale()");
    console.log("");
    console.log("If you're still getting errors, the issue is elsewhere.");
    return;
  }

  // ============================================================================
  // Grant ADMIN_ROLE to PrimaryMarket
  // ============================================================================
  
  console.log("❌ PrimaryMarket does NOT have ADMIN_ROLE");
  console.log("⏳ Granting ADMIN_ROLE to PrimaryMarket...\n");
  
  try {
    const tx = await assetRegistry.grantRole(ADMIN_ROLE, PRIMARY_MARKET);
    console.log("📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log("✅ Transaction confirmed!");
      console.log("✅ PrimaryMarket now has ADMIN_ROLE");
      console.log("✅ PrimaryMarket can now call recordSale()");
      console.log("");
      console.log("🎉 Permissions fixed! Try your purchase again!");
    } else {
      console.log("❌ Transaction failed!");
    }
    
    console.log("");
    console.log("Transaction Details:");
    console.log("  Gas used:", receipt.gasUsed.toString());
    console.log("  Block:", receipt.blockNumber);
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    
    if (error.message.includes("AccessControl")) {
      console.log("\n⚠️  You don't have admin permissions!");
      console.log("   Only the AssetRegistry admin can grant roles.");
      console.log("   Make sure you're using the wallet that deployed the contracts.");
    }
  }

  console.log("");
  console.log("================================================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });