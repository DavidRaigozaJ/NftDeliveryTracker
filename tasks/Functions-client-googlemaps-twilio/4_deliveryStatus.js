const { task, types } = require("hardhat/config")
const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require("../../network-config")

task("functions-initialize-user", "Seed NFTDeliveryTracker with User Data")
  .addParam("clientContract", "Contract address for NFTDeliveryTracker")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre

    if (network.name === "hardhat") {
      throw new Error(
        'This command cannot be used on a local hardhat chain. Specify a valid network or simulate an NFTDeliveryTracker request locally with "npx hardhat functions-simulate".'
      )
    }

    const NFTDeliveryTrackerAddress = taskArgs.clientContract

    if (!ethers.utils.isAddress(NFTDeliveryTrackerAddress)) {
      throw new Error("Please provide a valid contract address for the NFTDeliveryTracker contract")
    }

    const accounts = await ethers.getSigners()

    if (!accounts[1]) {
      throw new Error("User Wallet Address missing - you may need to add a second private key to the hardhat config.")
    }

    const userAddress = accounts[1].address

    if (!userAddress || !ethers.utils.isAddress(userAddress)) {
      throw new Error("Invalid Second Wallet Address. Please check SECOND_PRIVATE_KEY in env vars.")
    }

    // Hardcoded user data
    const userName = "David"
    const userEmail = "frustramatic@gmail.com"
    const userId = "raigoza.david.j@gmail.com"
    const lastDistance = 40000
    const lastPaidAmount = 0
    const totalPaid = 0

    console.log(
      "\n Adding the following user data to NFTDeliveryTracker: ",
      userName,
      userEmail,
      userId,
      lastDistance,
      lastPaidAmount,
      totalPaid
    )

    const clientContractFactory = await ethers.getContractFactory("NFTDeliveryTracker")
    const clientContract = await clientContractFactory.attach(NFTDeliveryTrackerAddress)

    try {
      const setUserDataTx = await clientContract.setUserData(
        userAddress,
        userName,
        userEmail,
        userId,
        lastDistance,
        lastPaidAmount,
        totalPaid
      )

      await setUserDataTx.wait(1)
    } catch (error) {
      console.log(
        `\nError writing user data for ${userId} at address ${userAddress} to the NFTDeliveryTracker: ${error}`
      )
      throw error
    }

    console.log(`\nSeeded initial User Data for ${userName} and assigned them wallet address ${userAddress}.`)
  })
