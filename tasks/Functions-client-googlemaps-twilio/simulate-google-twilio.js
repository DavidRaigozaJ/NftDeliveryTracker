const {
  simulateRequest,
  buildRequest,
  getDecodedResultLog,
  getRequestConfig,
} = require("../../FunctionsSandboxLibrary")
const { networkConfig } = require("../../network-config")

task("functions-simulate-brandcoin", "Simulates an end-to-end fulfillment locally for the NFTDeliveryTracker contract")
  .addOptionalParam(
    "gaslimit",
    "Maximum amount of gas that can be used to call fulfillRequest in the client contract (defaults to 100,000)"
  )
  .setAction(async (taskArgs, hre) => {
    // Simulation can only be conducted on a local fork of the blockchain
    if (network.name !== "hardhat") {
      throw Error('Simulated requests can only be conducted using --network "hardhat"')
    }

    // Check to see if the maximum gas limit has been exceeded
    const gasLimit = parseInt(taskArgs.gaslimit ?? "100000")
    if (gasLimit > 300000) {
      throw Error("Gas limit must be less than or equal to 300,000")
    }

    // Recompile the latest version of the contracts
    console.log("\n__Compiling Contracts__")
    await run("compile")

    // Deploy BrandCoin
    console.log("\n__Deploying Demo Brand Coin__")
    const coinFactory = await ethers.getContractFactory("BrandCoin")
    const coinContract = await coinFactory.deploy()
    await coinContract.deployTransaction.wait(1)

    // Deploy a mock oracle & registry contract to simulate a fulfillment
    const { oracle, registry, linkToken } = await deployMockOracle()

    // Deploy the client contract
    console.log("\n__Deploying Demo NFTDeliveryTracker Contract__")
    const clientContractFactory = await ethers.getContractFactory("NFTDeliveryTracker")
    const clientContract = await clientContractFactory.deploy(oracle.address, coinContract.address)
    await clientContract.deployTransaction.wait(1)

    const accounts = await ethers.getSigners()
    const deployer = accounts[0]

    // Add the wallet initiating the request to the oracle allowlist to authorize a simulated fulfillment.
    const allowlistTx = await oracle.addAuthorizedSenders([deployer.address])
    await allowlistTx.wait(1)

    // Approve NFTDeliveryTracker as spender of the tokens belonging to the deployer of the Demo Brand Coin
    const deployerTokenBalance = await coinContract.balanceOf(deployer.address)
    const payer = clientContract.address
    await coinContract.approve(payer, deployerTokenBalance)

    // Create & fund a subscription
    const createSubscriptionTx = await registry.createSubscription()
    const createSubscriptionReceipt = await createSubscriptionTx.wait(1)
    const subscriptionId = createSubscriptionReceipt.events[0].args["subscriptionId"].toNumber()
    const juelsAmount = ethers.utils.parseUnits("10")
    await linkToken.transferAndCall(
      registry.address,
      juelsAmount,
      ethers.utils.defaultAbiCoder.encode(["uint64"], [subscriptionId])
    )
    // Authorize the client contract to use the subscription
    await registry.addConsumer(subscriptionId, clientContract.address)

    // Build the parameters to make a request from the client contract
    const unvalidatedRequestConfig = require("../../Functions-request-config.js")
    const requestConfig = getRequestConfig(unvalidatedRequestConfig)
    // Fetch the mock DON public key
    const DONPublicKey = await oracle.getDONPublicKey()
    // Remove the preceding 0x from the DON// Continue from the previous part
    const DONPublicKeyNo0x = DONPublicKey.slice(2)
    const requestParams = buildRequest(
      DONPublicKeyNo0x,
      requestConfig.fulfillmentParams,
      requestConfig.requesterAddressOffset
    )

    // Add customer wallet to NFTDeliveryTracker
    console.log("\n__Adding customer wallet to NFTDeliveryTracker Contract__")
    const customerWallet = "0xYourCustomerWalletAddress" // replace with actual customer wallet address
    await clientContract.addCustomerWallet(customerWallet)

    // Make a request
    const requestTx = await clientContract.request(subscriptionId, requestParams.request, requestParams.signature, {
      value: ethers.utils.parseEther("0.1"),
    })
    await requestTx.wait(1)

    // Simulate a fulfillment
    const { request, signature } = requestParams
    const fulfillRequestParams = {
      gasLimit,
      request,
      signature,
      fulfillmentParams: requestConfig.fulfillmentParams,
    }
    const fulfillRequestTx = await simulateRequest(oracle, clientContract, fulfillRequestParams)
    const fulfillRequestReceipt = await fulfillRequestTx.wait(1)

    // Listen for the NFTDelivered event
    const NFTDeliveredEvent = getDecodedResultLog("NFTDelivered", fulfillRequestReceipt)
    if (!NFTDeliveredEvent) {
      throw Error("Failed to find NFTDelivered event")
    }

    // Calculate and log the gas used by the request and fulfillment
    const gasUsedByRequest = requestTx.gasLimit.mul(requestTx.gasPrice)
    const gasUsedByFulfillment = fulfillRequestTx.gasLimit.mul(fulfillRequestTx.gasPrice)
    console.log(
      "\n__Gas Usage__",
      "\n- Request Gas Used:",
      ethers.utils.formatEther(gasUsedByRequest),
      "\n- Fulfillment Gas Used:",
      ethers.utils.formatEther(gasUsedByFulfillment),
      "\n- Total Gas Used:",
      ethers.utils.formatEther(gasUsedByRequest.add(gasUsedByFulfillment))
    )
  })

const deployMockOracle = async () => {
  // Deploy a mock LINK token contract
  const linkTokenFactory = await ethers.getContractFactory("LinkToken")
  const linkToken = await linkTokenFactory.deploy()
  const linkEthFeedAddress = networkConfig["hardhat"]["linkEthPriceFeed"]
  // Deploy proxy admin
  await upgrades.deployProxyAdmin()
  // Deploy the oracle contract
  const oracleFactory = await ethers.getContractFactory("contracts/dev/functions/FunctionsOracle.sol:FunctionsOracle")
  const oracleProxy = await upgrades.deployProxy(oracleFactory, [], {
    kind: "transparent",
  })
  await oracleProxy.deployTransaction.wait(1)
  // Set the secrets encryption public DON key in the mock oracle contract
  await oracleProxy.setDONPublicKey("0x" + networkConfig["hardhat"]["functionsPublicKey"])
  // Deploy the mock registry billing contract
  const registryFactory = await ethers.getContractFactory(
    "contracts/dev/functions/FunctionsBillingRegistry.sol:FunctionsBillingRegistry"
  )
  const registryProxy = await upgrades.deployProxy(
    registryFactory,
    [linkToken.address, linkEthFeedAddress, oracleProxy.address],
    {
      kind: "transparent",
    }
  )
  await registryProxy.deployTransaction.wait(1)
  // Set registry configuration
  const config = {
    maxGasLimit: 300_000,
    stalenessSeconds: 86_400,
    gasAfterPaymentCalculation: 39_173,
    weiPerUnitLink: ethers.BigNumber.from("5000000000000000"),
    gasOverhead: 519_719,
    requestTimeoutSeconds: 300,
  }
  await registryProxy.setConfig(
    config.maxGasLimit,
    config.stalenessSeconds,
    config.gasAfterPaymentCalculation,
    config.weiPerUnitLink,
    config.gasOverhead,
    config.requestTimeoutSeconds
  )
  // Set the current account as an authorized sender in the mock registry to allow for simulated local fulfillments
  const accounts = await ethers.getSigners()
  const deployer = accounts[0]
  await registryProxy.setAuthorizedSenders([oracleProxy.address, deployer.address])
  await oracleProxy.setRegistry(registryProxy.address)
  return { oracle: oracleProxy, registry: registryProxy, linkToken }
}
