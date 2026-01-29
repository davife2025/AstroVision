// scripts/deploy-simple.js
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Simplified AstroDAO to BNB Chain...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "BNB\n");

  // Deploy AstroDAO (no token needed!)
  console.log("1️⃣ Deploying AstroDAO...");
  
  const AstroDAO = await hre.ethers.getContractFactory("AstroDAO");
  const dao = await AstroDAO.deploy();
  await dao.waitForDeployment();
  
  const daoAddress = await dao.getAddress();
  console.log("✅ AstroDAO deployed to:", daoAddress);
  console.log("");

  // Verify deployment
  console.log("2️⃣ Verifying deployment...");
  const proposalCount = await dao.proposalCount();
  const votingPeriod = await dao.votingPeriod();
  
  console.log("✅ Proposal Count:", proposalCount.toString());
  console.log("✅ Voting Period:", votingPeriod.toString(), "seconds (", Number(votingPeriod) / 86400, "days)");
  console.log("");

  // Create test proposal
  console.log("3️⃣ Creating test proposal...");
  try {
    const tx = await dao.createProposal(
      0, // WEEKLY_TOPIC
      "Should we discuss Quantum Computing this week?",
      "Quantum computing has potential applications in drug discovery and climate modeling.",
      "" // No IPFS hash
    );
    await tx.wait();
    console.log("✅ Test proposal created!");
  } catch (error) {
    console.log("⚠️  Could not create test proposal:", error.message);
  }
  console.log("");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contract: {
      AstroDAO: {
        address: daoAddress,
        votingPeriod: votingPeriod.toString(),
        quorum: "10%"
      }
    }
  };

  console.log("📄 Deployment Summary:");
  console.log("=====================================");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log("=====================================\n");

  console.log("⚠️  IMPORTANT: Update your .env file!");
  console.log("   REACT_APP_DAO_CONTRACT_ADDRESS=" + daoAddress);
  console.log("");

  console.log("📋 Next Steps:");
  console.log("1. Copy the contract address above");
  console.log("2. Add to .env: REACT_APP_DAO_CONTRACT_ADDRESS=" + daoAddress);
  console.log("3. Restart your dev server: npm start");
  console.log("4. Connect wallet and start voting!");
  console.log("");

  // Save to file
  const fs = require('fs');
  fs.writeFileSync(
    'deployment-simple.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("✅ Deployment info saved to deployment-simple.json");

  // Verify on BSCScan if on testnet
  if (hre.network.name === "bscTestnet") {
    console.log("\n⏳ Waiting for block confirmations before verification...");
    await dao.deploymentTransaction().wait(6);
    
    console.log("\n4️⃣ Verifying contract on BSCScan...");
    try {
      await hre.run("verify:verify", {
        address: daoAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on BSCScan!");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });