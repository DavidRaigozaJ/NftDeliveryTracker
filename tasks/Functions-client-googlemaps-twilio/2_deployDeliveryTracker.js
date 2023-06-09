const { types } = require("hardhat/config")
const { networkConfig } = require("../../network-config")

task("functions-deploy-nft-delivery-tracker", "Deploys the NFTDeliveryTracker contract")
  .addParam("brandcoinContract", "Contract address for the BrandCoin")
  .addOptionalParam("verify", "Set to true to verify client contract", false, types.boolean)
  .setAction(async (taskArgs, hre) => {
    const brandcoinAddress = taskArgs.brandcoinContract
    const network = hre.network.name

    if (!ethers.utils.isAddress(brandcoinAddress)) {
      throw Error("Please provide a valid contract address for the BrandCoin contract")
    }

    console.log("\n__Compiling Contracts__")
    await hre.run("compile")

    const accounts = await ethers.getSigners()

    // Check if the networkConfig has the current network and it has the functionsOracleProxy
    if (networkConfig[network] && networkConfig[network].functionsOracleProxy) {
      const oracleAddress = networkConfig[network].functionsOracleProxy

      // Deploy NFTDeliveryTracker
      const clientContractFactory = await ethers.getContractFactory("NFTDeliveryTracker")
      const clientContract = await clientContractFactory.deploy(oracleAddress, brandcoinAddress)

      console.log(`NFTDeliveryTracker contract deployed at: ${clientContract.address}`)
    } else {
      console.log(`No oracle address found for the current network: ${network}`)
    }
  })
