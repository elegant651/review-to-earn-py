import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../apps/backend/.env") });

/**
 * Deploy CampaignFactory contract to Sepolia
 */
async function main() {
  const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
  const DEPLOYER_PRIVATE_KEY = process.env.REWARDER_PRIVATE_KEY;
  const PYUSD_CONTRACT_ADDRESS = process.env.PYUSD_CONTRACT_ADDRESS;

  if (!SEPOLIA_RPC_URL || !DEPLOYER_PRIVATE_KEY || !PYUSD_CONTRACT_ADDRESS) {
    throw new Error("Missing required environment variables");
  }

  console.log("🚀 Deploying CampaignFactory to Sepolia...\n");

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

  console.log("Deployer address:", wallet.address);
  console.log("PYUSD Token:", PYUSD_CONTRACT_ADDRESS);

  const balance = await provider.getBalance(wallet.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH\n");

  // Read compiled contract
  const artifactCandidates = [
    path.join(__dirname, "../artifacts/CampaignFactory.json"),
    path.join(
      __dirname,
      "../artifacts/contracts/CampaignFactory.sol/CampaignFactory.json"
    ),
    path.join(
      __dirname,
      "../artifacts/src/CampaignFactory.sol/CampaignFactory.json"
    ),
  ];

  const artifactPath = artifactCandidates.find((candidate) =>
    fs.existsSync(candidate)
  );

  if (!artifactPath) {
    throw new Error(
      "CampaignFactory artifact not found. Run `pnpm --filter @py-ext/contracts compile` first."
    );
  }

  const factoryArtifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Deploy CampaignFactory
  console.log("Deploying CampaignFactory...");
  const Factory = new ethers.ContractFactory(
    factoryArtifact.abi,
    factoryArtifact.bytecode,
    wallet
  );

  const factory = await Factory.deploy(PYUSD_CONTRACT_ADDRESS);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("✅ CampaignFactory deployed to:", factoryAddress);

  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    factoryAddress,
    pyusdToken: PYUSD_CONTRACT_ADDRESS,
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    blockNumber: await provider.getBlockNumber(),
  };

  const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n📄 Deployment info saved to:", deploymentPath);
  console.log("\n🎉 Deployment complete!");
  console.log("\nNext steps:");
  console.log("1. Update backend .env with CAMPAIGN_FACTORY_ADDRESS");
  console.log("2. Verify contract on Etherscan (optional)");
  console.log(`   npx hardhat verify --network sepolia ${factoryAddress} ${PYUSD_CONTRACT_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
