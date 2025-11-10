// test/OPNFractionalization.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OPN Fractionalization Platform", function () {
  let fractionalization;
  let kycRegistry;
  let owner;
  let complianceOfficer;
  let kycVerifier;
  let user1;
  let user2;
  let feeRecipient;

  const BASE_URI = "https://api.opn-fractionalization.com/metadata/";
  const PLATFORM_FEE = 250; // 2.5%

  beforeEach(async function () {
    [owner, complianceOfficer, kycVerifier, user1, user2, feeRecipient] = await ethers.getSigners();

    // Deploy KYCRegistry
    const KYCRegistry = await ethers.getContractFactory("KYCRegistry");
    kycRegistry = await KYCRegistry.deploy();
    await kycRegistry.waitForDeployment();

    // Deploy OPNFractionalization
    const OPNFractionalization = await ethers.getContractFactory("OPNFractionalization");
    fractionalization = await OPNFractionalization.deploy(
      BASE_URI,
      await kycRegistry.getAddress(),
      feeRecipient.address
    );
    await fractionalization.waitForDeployment();

    // Setup roles
    const COMPLIANCE_ROLE = await fractionalization.COMPLIANCE_ROLE();
    const KYC_VERIFIER_ROLE = await kycRegistry.KYC_VERIFIER_ROLE();

    await fractionalization.grantRole(COMPLIANCE_ROLE, complianceOfficer.address);
    await kycRegistry.grantRole(KYC_VERIFIER_ROLE, kycVerifier.address);
  });

  describe("KYC Registry", function () {
    it("Should verify user KYC", async function () {
      await kycRegistry.connect(kycVerifier).verifyKYC(
        user1.address,
        "QmTestHash123",
        0 // Use default validity period
      );

      expect(await kycRegistry.isVerified(user1.address)).to.be.true;
    });

    it("Should not allow non-verifier to verify KYC", async function () {
      await expect(
        kycRegistry.connect(user1).verifyKYC(user2.address, "QmTestHash123", 0)
      ).to.be.reverted;
    });

    it("Should revoke KYC", async function () {
      await kycRegistry.connect(kycVerifier).verifyKYC(user1.address, "QmTestHash123", 0);
      await kycRegistry.connect(kycVerifier).revokeKYC(user1.address, "Test reason");
      
      expect(await kycRegistry.isVerified(user1.address)).to.be.false;
    });
  });

  describe("Fractionalization Requests", function () {
    beforeEach(async function () {
      await kycRegistry.connect(kycVerifier).verifyKYC(user1.address, "QmTestHash123", 0);
    });

    it("Should create a fractionalization request", async function () {
      await expect(
        fractionalization.connect(user1).createFractionalizationRequest(
          "Luxury Watch",
          "Patek Philippe Nautilus 5711",
          "Iconic luxury sports watch",
          "https://example.com/watch.jpg",
          1000,
          ethers.parseEther("0.15"),
          true
        )
      ).to.emit(fractionalization, "RequestCreated");

      const requests = await fractionalization.getUserRequests(user1.address);
      expect(requests.length).to.equal(1);
    });

    it("Should not allow non-KYC verified user to create request", async function () {
      await expect(
        fractionalization.connect(user2).createFractionalizationRequest(
          "Test", "Test", "Test", "Test", 100, 1000, false
        )
      ).to.be.revertedWith("Proposer must be KYC verified");
    });
  });

  describe("Request Approval/Rejection", function () {
    let requestId;

    beforeEach(async function () {
      await kycRegistry.connect(kycVerifier).verifyKYC(user1.address, "QmTestHash123", 0);
      
      const tx = await fractionalization.connect(user1).createFractionalizationRequest(
        "Luxury Watch",
        "Patek Philippe Nautilus 5711",
        "Iconic luxury sports watch",
        "https://example.com/watch.jpg",
        1000,
        ethers.parseEther("0.15"),
        true
      );
      
      const receipt = await tx.wait();
      requestId = receipt.logs[0].args.requestId;
    });

    it("Should approve request and mint tokens", async function () {
      await expect(
        fractionalization.connect(complianceOfficer).approveRequest(requestId)
      ).to.emit(fractionalization, "RequestApproved");

      const request = await fractionalization.requests(requestId);
      expect(request.status).to.equal(1); // Approved

      const assetDetails = await fractionalization.assetDetails(0);
      expect(assetDetails.totalSupply).to.equal(1000);
      expect(assetDetails.availableSupply).to.equal(1000);
    });

    it("Should reject request", async function () {
      await expect(
        fractionalization.connect(complianceOfficer).rejectRequest(requestId, "Insufficient documentation")
      ).to.emit(fractionalization, "RequestRejected");

      const request = await fractionalization.requests(requestId);
      expect(request.status).to.equal(2); // Rejected
    });

    it("Should not allow non-compliance officer to approve", async function () {
      await expect(
        fractionalization.connect(user1).approveRequest(requestId)
      ).to.be.reverted;
    });
  });

  describe("Marketplace - Purchase Fractions", function () {
    let tokenId;
    const fractionPrice = ethers.parseEther("0.15");
    const totalFractions = 1000;

    beforeEach(async function () {
      // Setup: Create and approve a fractionalization request
      await kycRegistry.connect(kycVerifier).verifyKYC(user1.address, "QmTestHash123", 0);
      await kycRegistry.connect(kycVerifier).verifyKYC(user2.address, "QmTestHash123", 0);
      
      await fractionalization.connect(user1).createFractionalizationRequest(
        "Luxury Watch",
        "Patek Philippe Nautilus 5711",
        "Iconic luxury sports watch",
        "https://example.com/watch.jpg",
        totalFractions,
        fractionPrice,
        true
      );
      
      await fractionalization.connect(complianceOfficer).approveRequest(0);
      tokenId = 0;
    });

    it("Should allow KYC verified user to purchase fractions", async function () {
      const purchaseAmount = 10;
      const totalCost = fractionPrice * BigInt(purchaseAmount);
      
      const initialCreatorBalance = await ethers.provider.getBalance(user1.address);
      const initialFeeRecipientBalance = await ethers.provider.getBalance(feeRecipient.address);
      
      await expect(
        fractionalization.connect(user2).purchaseFractions(tokenId, purchaseAmount, { value: totalCost })
      ).to.emit(fractionalization, "FractionsPurchased");
      
      // Check buyer received fractions
      expect(await fractionalization.balanceOf(user2.address, tokenId)).to.equal(purchaseAmount);
      
      // Check asset details updated
      const assetDetails = await fractionalization.assetDetails(tokenId);
      expect(assetDetails.availableSupply).to.equal(totalFractions - purchaseAmount);
      
      // Check payments
      const fee = (totalCost * BigInt(PLATFORM_FEE)) / BigInt(10000);
      const creatorPayment = totalCost - fee;
      
      const finalCreatorBalance = await ethers.provider.getBalance(user1.address);
      const finalFeeRecipientBalance = await ethers.provider.getBalance(feeRecipient.address);
      
      expect(finalCreatorBalance - initialCreatorBalance).to.equal(creatorPayment);
      expect(finalFeeRecipientBalance - initialFeeRecipientBalance).to.equal(fee);
    });

    it("Should not allow non-KYC user to purchase when KYC required", async function () {
      // Create a new user without KYC
      const [,,,,, nonKycUser] = await ethers.getSigners();
      
      await expect(
        fractionalization.connect(nonKycUser).purchaseFractions(tokenId, 10, { value: fractionPrice * BigInt(10) })
      ).to.be.revertedWith("Purchaser must be KYC verified");
    });

    it("Should refund excess payment", async function () {
      const purchaseAmount = 5;
      const totalCost = fractionPrice * BigInt(purchaseAmount);
      const excessPayment = ethers.parseEther("1");
      
      const initialBalance = await ethers.provider.getBalance(user2.address);
      
      const tx = await fractionalization.connect(user2).purchaseFractions(
        tokenId, 
        purchaseAmount, 
        { value: totalCost + excessPayment }
      );
      
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const finalBalance = await ethers.provider.getBalance(user2.address);
      
      // Should have received refund minus gas costs
      expect(initialBalance - finalBalance - gasUsed).to.be.closeTo(totalCost, ethers.parseEther("0.001"));
    });
  });

  describe("Admin Functions", function () {
    it("Should update platform fee", async function () {
      const newFee = 500; // 5%
      await fractionalization.updatePlatformFee(newFee);
      expect(await fractionalization.platformFee()).to.equal(newFee);
    });

    it("Should not allow fee above 10%", async function () {
      await expect(
        fractionalization.updatePlatformFee(1001)
      ).to.be.revertedWith("Fee too high");
    });

    it("Should pause and unpause contract", async function () {
      await fractionalization.pause();
      
      await kycRegistry.connect(kycVerifier).verifyKYC(user1.address, "QmTestHash123", 0);
      
      await expect(
        fractionalization.connect(user1).createFractionalizationRequest(
          "Test", "Test", "Test", "Test", 100, 1000, false
        )
      ).to.be.revertedWithCustomError(fractionalization, "EnforcedPause");

      await fractionalization.unpause();
      
      await expect(
        fractionalization.connect(user1).createFractionalizationRequest(
          "Test", "Test", "Test", "Test", 100, 1000, false
        )
      ).to.emit(fractionalization, "RequestCreated");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await kycRegistry.connect(kycVerifier).verifyKYC(user1.address, "QmTestHash123", 0);
      
      // Create multiple requests
      for (let i = 0; i < 3; i++) {
        await fractionalization.connect(user1).createFractionalizationRequest(
          "Asset Type",
          `Asset ${i}`,
          "Description",
          "https://example.com/asset.jpg",
          100,
          ethers.parseEther("0.1"),
          false
        );
      }
      
      // Approve one, reject one, leave one pending
      await fractionalization.connect(complianceOfficer).approveRequest(0);
      await fractionalization.connect(complianceOfficer).rejectRequest(1, "Test");
    });

    it("Should get pending requests", async function () {
      const pendingRequests = await fractionalization.getPendingRequests();
      expect(pendingRequests.length).to.equal(1);
      expect(pendingRequests[0]).to.equal(2);
    });

    it("Should get active assets", async function () {
      const activeAssets = await fractionalization.getActiveAssets();
      expect(activeAssets.length).to.equal(1);
      expect(activeAssets[0]).to.equal(0);
    });

    it("Should get user requests", async function () {
      const userRequests = await fractionalization.getUserRequests(user1.address);
      expect(userRequests.length).to.equal(3);
    });
  });
});