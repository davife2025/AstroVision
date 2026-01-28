const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AstroDAO...");

  // You need to either:
  // 1. Deploy a governance token first, OR
  // 2. Use an existing token address
  
  // Option 1: Deploy a simple governance token first (recommended for testing)
  console.log("📝 Deploying Governance Token first...");
  const AstroToken = await hre.ethers.getContractFactory("AstroToken");
  const token = await AstroToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ AstroToken deployed to:", tokenAddress);

  // Option 2: Use existing token (uncomment and replace address)
  // const tokenAddress = "0xYourExistingTokenAddress";
  
  console.log("📝 Deploying AstroDAO...");
  const AstroDAO = await hre.ethers.getContractFactory("AstroDAO");
  const dao = await AstroDAO.deploy(tokenAddress);

  await dao.waitForDeployment();

  const daoAddress = await dao.getAddress();
  console.log("✅ AstroDAO deployed to:", daoAddress);
  console.log("📝 Add these to your .env:");
  console.log(`REACT_APP_DAO_CONTRACT_ADDRESS=${daoAddress}`);
  console.log(`REACT_APP_TOKEN_CONTRACT_ADDRESS=${tokenAddress}`);
  
  // Wait for block confirmations
  console.log("⏳ Waiting for block confirmations...");
  await dao.deploymentTransaction().wait(5);
  
  // Verify on BscScan
  console.log("🔍 Verifying contracts on BscScan...");
  
  try {
    await hre.run("verify:verify", {
      address: tokenAddress,
      constructorArguments: []
    });
    console.log("✅ Token verified!");
  } catch (error) {
    console.log("⚠️  Token verification failed:", error.message);
  }
  
  try {
    await hre.run("verify:verify", {
      address: daoAddress,
      constructorArguments: [tokenAddress]
    });
    console.log("✅ DAO verified!");
  } catch (error) {
    console.log("⚠️  DAO verification failed:", error.message);
  }
  
  console.log("✅ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });