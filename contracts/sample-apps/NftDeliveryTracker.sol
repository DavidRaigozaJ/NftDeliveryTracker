// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../dev/functions/FunctionsClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBrandCoin is IERC20 {
  function mint(address to, uint256 amount) external;

  function decimals() external returns (uint8);
}

contract NFTDeliveryTracker is FunctionsClient, ConfirmedOwner {
  using Functions for Functions.Request;

  bytes32 public latestRequestId;
  bytes public latestResponse;
  bytes public latestError;
  string public latestUserRequestedId;

  address public brandcoin; // Brandcoin address for rewards.

  error NFTDeliveryTracker_UserPaymentError(string userId, uint256 payment, string errorMsg);

  struct User {
    string name;
    string email;
    string userId;
    uint256 distance;
    uint256 lastPaidAmount;
    uint256 totalPaid;
  }

  mapping(address => User) userData;

  event OCRResponse(bytes32 indexed requestId, bytes result, bytes err);
  event UserPaid(string userId, uint256 amount);

  constructor(address oracle, address _brandcoin) FunctionsClient(oracle) ConfirmedOwner(msg.sender) {
    brandcoin = _brandcoin;
  }

  function executeRequest(
    string calldata source,
    bytes calldata secrets,
    string[] calldata args, // args are: userID, NFTID
    uint64 subscriptionId,
    uint32 gasLimit
  ) public onlyOwner returns (bytes32) {
    Functions.Request memory req;
    req.initializeRequest(Functions.Location.Inline, Functions.CodeLanguage.JavaScript, source);

    if (secrets.length > 0) {
      req.addRemoteSecrets(secrets);
    }
    if (args.length > 0) {
      req.addArgs(args);
    }

    bytes32 requestId = sendRequest(req, subscriptionId, gasLimit);
    latestRequestId = requestId;
    latestUserRequestedId = args[0];
    return requestId;
  }

  function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
    latestResponse = response;
    latestError = err;
    emit OCRResponse(requestId, response, err);

    // Check if there is no error.
    bool nilErr = (err.length == 0);
    if (nilErr) {
      string memory userId = latestUserRequestedId;
      address userAddress = getUserAddress(userId);

      // Decoding the response to get the latest distance and difference in distance.
      (int256 latestDistance, int256 diffDistance) = abi.decode(response, (int256, int256));

      if (diffDistance <= 0) {
        // No rewards due.
        return;
      }

      // Pay the user at 'userData[userAddress].walletAddress'.
      uint8 coinDecimals = IBrandCoin(brandcoin).decimals();

      // User gets 1 Coin per unit of additional distance covered.
      uint256 rewardDue = (uint256(diffDistance) * 1 * 10 ** coinDecimals);

      // Pay the user the due reward.
      payUser(userAddress, rewardDue);

      // Update User Mapping.
      userData[userAddress].distance = uint256(latestDistance);
      userData[userAddress].lastPaidAmount = rewardDue;
      userData[userAddress].totalPaid += rewardDue;
    }
  }

  function setUserData(
    address userAddress,
    string memory name,
    string memory email,
    string memory userId,
    uint256 lastDistance,
    uint256 lastPaidAmount,
    uint256 totalPaid
  ) public onlyOwner {
    userData[userAddress].userId = userId;
    userData[userAddress].name = name;
    userData[userAddress].email = email;
    userData[userAddress].distance = lastDistance;
    userData[userAddress].lastPaidAmount = lastPaidAmount;
    userData[userAddress].totalPaid = totalPaid;
  }

  function payUser(address userAddress, uint256 amountDue) internal {
    IBrandCoin token = IBrandCoin(brandcoin);
    if (userAddress == address(0)) {
      revert NFTDeliveryTracker_UserPaymentError(
        userData[userAddress].userId,
        amountDue,
        "User has no wallet associated."
      );
    }

    token.transferFrom(owner(), userAddress, amountDue);
    emit UserPaid(userData[userAddress].userId, amountDue);
  }

  function getUserData(address userAddress) public view returns (User memory) {
    return userData[userAddress];
  }

  // Utility Functions
  function updateOracleAddress(address oracle) public onlyOwner {
    setOracle(oracle);
  }

  function updateBrandcoinAddress(address _brandcoin) public onlyOwner {
    brandcoin = _brandcoin;
  }

  function addSimulatedRequestId(address oracleAddress, bytes32 requestId) public onlyOwner {
    addExternalRequest(oracleAddress, requestId);
  }

  function getUserAddress(string memory userId) public pure returns (address) {
    return 0x4E7a7c8779DF158dF75638d1b4FF97C0Dd463b55; // replace with your mock address
  }
}
