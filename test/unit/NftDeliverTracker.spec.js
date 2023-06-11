const { expect } = require("chai")

beforeEach(async function () {
  // Get the ContractFactory and Signers here.
  NFTDeliveryTracker = await ethers.getContractFactory("NFTDeliveryTracker")
  Brandcoin = await ethers.getContractFactory("BrandCoin")

  ;[owner, addr1, addr2, ...addrs] = await ethers.getSigners()

  // Deploying the Brandcoin contract first
  brandcoin = await Brandcoin.deploy(/* pass necessary arguments here */)
  await brandcoin.deployed()

  // Substitute the mock oracle address with your actual oracle address.
  const oracleAddress = "0x40193c8518BB267228Fc409a613bDbD8eC5a97b3"

  // Deploying the NFTDeliveryTracker contract
  nftDeliveryTracker = await NFTDeliveryTracker.deploy(oracleAddress, brandcoin.address)
  await nftDeliveryTracker.deployed()

  // You can also do some initialization if needed.
  // e.g., minting some tokens, setting user data, etc.
})

describe("executeRequest", function () {
  it("should set user data correctly", async function () {
    await nftDeliveryTracker.setUserData(addr1.address, "John", "john@example.com", "john123", 10, 5, 15)

    let userData = await nftDeliveryTracker.getUserData(addr1.address)

    expect(userData.userId).to.equal("john123")
    expect(userData.name).to.equal("John")
    expect(userData.email).to.equal("john@example.com")
    expect(userData.distance).to.equal(10)
    expect(userData.lastPaidAmount).to.equal(5)
    expect(userData.totalPaid).to.equal(15)
  })

  describe("fulfillRequest", function () {
    it("should fulfill the request and update latestResponse, latestError", async function () {
      // Implement your test here. Keep in mind this is an internal function.
      // So you may need to call an external function that changes its state.
    })
  })

  describe("setUserData", function () {
    it("should set user data correctly", async function () {
      await nftDeliveryTracker.setUserData(addr1.address, "John", "john@example.com", "john123", 10, 5, 15)

      let userData = await nftDeliveryTracker.getUserData(addr1.address)

      expect(userData.userId).to.equal("john123")
      expect(userData.name).to.equal("John")
      expect(userData.email).to.equal("john@example.com")
      expect(userData.distance).to.equal(10)
      expect(userData.lastPaidAmount).to.equal(5)
      expect(userData.totalPaid).to.equal(15)
    })
  })

  describe("payUser", function () {
    it("should transfer the correct amount to user and emit UserPaid event", async function () {
      const amountDue = 1000
    })
  })
})
