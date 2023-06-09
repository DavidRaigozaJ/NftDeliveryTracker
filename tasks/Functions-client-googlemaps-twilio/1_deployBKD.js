const { types } = require("hardhat/config")
const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require("../../network-config")

task("functions-deploy-brandcoin", "Deploys the BrandCoin contract")
  .addOptionalParam("verify", "Set to true to verify client contract", false, types.boolean)
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain. Specify a valid network or simulate an FunctionsConsumer request locally with "npx hardhat functions-simulate".'
      )
    }

    console.log(`Deploying BrandCoin contract to ${network.name}`)

    console.log("\n__Compiling Contracts__")
    await run("compile")

    const brandcoinContractFactory = await ethers.getContractFactory("BrandCoin")

    const brandcoinContract = await brandcoinContractFactory.deploy()

    console.log(
      `\nWaiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${brandcoinContract.deployTransaction.hash} to be confirmed...`
    )
    await brandcoinContract.deployTransaction.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

    const verifyContract = taskArgs.verify

    if (verifyContract && (process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY)) {
      try {
        console.log("\nVerifying contract...")
        await brandcoinContract.deployTransaction.wait(Math.max(6 - VERIFICATION_BLOCK_CONFIRMATIONS, 0))
        await run("verify:verify", {
          address: brandcoinContract.address,
          constructorArguments: [],
        })
        console.log("Contract verified")
      } catch (error) {
        if (!error.message.includes("Already Verified")) {
          console.log("Error verifying contract. Try delete the ./build folder and try again.")
          console.log(error)
        } else {
          console.log("Contract already verified")
        }
      }
    } else if (verifyContract) {
      console.log("\nPOLYGONSCAN_API_KEY or ETHERSCAN_API_KEY missing. Skipping contract verification...")
    }

    console.log(`\tBrandCoin contract deployed to ${brandcoinContract.address} on ${network.name}`)
  })
