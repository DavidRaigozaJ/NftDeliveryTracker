const { types } = require("hardhat/config")
const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require("../../network-config")

task("functions-approve-spender", "Approves NFTDeliveryTracker to spend IBrandToken on behalf of the owner")
  .addParam("brandcoinContract", "Contract address for the IBrandCoin")
  .addParam("clientContract", "Contract address for NFTDeliveryTracker")
  .addOptionalParam("verify", "Set to true to verify client contract", false, types.boolean)
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Specify a valid network or simulate a NFTDeliveryTracker request locally with "npx hardhat functions-simulate".'
      )
    }

    console.log("\n__Compiling Contracts__")
    await run("compile")

    const oracleAddress = networkConfig[network.name]["functionsOracleProxy"]
    const brandCoinAddress = taskArgs.brandcoinContract
    const nftDeliveryTrackerAddress = taskArgs.clientContract

    if (!ethers.utils.isAddress(brandCoinAddress))
      throw Error("Please provide a valid contract address for the IBranCoin contract")

    if (!ethers.utils.isAddress(nftDeliveryTrackerAddress))
      throw Error("Please provide a valid contract address for the NFTDeliveryTracker contract")

    //  Approve NFTDeliveryTracker as spender of the tokens belonging to the deployer of the IBrandCoin
    const [deployer] = await ethers.getSigners()
    console.log(
      `\nApproving NFTDeliveryTracker to spend the balance of the IBrandCoin deployer ("${deployer.address}")...`
    )

    const brandCoinContract = await ethers.getContractAt("IBrandCoin", brandCoinAddress)
    const deployerTokenBalance = await brandCoinContract.balanceOf(deployer.address)

    await brandCoinContract.approve(nftDeliveryTrackerAddress, deployerTokenBalance)

    console.log("\nNFTDeliveryTracker is now approved to spend tokens...")
  })
