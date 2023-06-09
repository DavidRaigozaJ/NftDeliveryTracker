const fs = require("fs")

console.log("Origin: ", typeof process.env.ORIGIN)
console.log("Destination: ", typeof process.env.DESTINATION)
console.log("Customer Email: ", typeof process.env.CUSTOMER_EMAIL)
console.log("Verified Sender: ", typeof process.env.VERIFIED_SENDER)

// Loads environment variables from .env.enc file (if it exists)
require("@chainlink/env-enc").config()

const Location = {
  Inline: 0,
  Remote: 1,
}

const CodeLanguage = {
  JavaScript: 0,
}

const ReturnType = {
  uint: "uint256",
  uint256: "uint256",
  int: "int256",
  int256: "int256",
  string: "string",
  bytes: "Buffer",
  Buffer: "Buffer",
}

const requestConfig = {
  // Location of source code (only Inline is currently supported)
  codeLocation: Location.Inline,
  // Code language (only JavaScript is currently supported)
  codeLanguage: CodeLanguage.JavaScript,
  // string containing the source code to be executed. Relative path used.
  source: fs.readFileSync("./Google-Chainlink-Functions-Source-Example.js").toString(), // Modify the source path if necessary
  // Per-node secrets objects assigned to each DON member. When using per-node secrets, nodes can only use secrets which they have been assigned.
  // ETH wallet key used to sign secrets so they cannot be accessed by a 3rd party
  walletPrivateKey: process.env["PRIVATE_KEY"],
  // args (string only array) can be accessed within the source code with `args[index]` (ie: args[0]).
  // args in sequence are: UserID, NFTID, Origin, Destination, Customer Email, Verified Sender
  args: ["David", "frustramatic@gmail.com", "40000", "0", "0"],
  gasLimit: process.env.GAS_LIMIT || 3000000, // Set a fallback gas limit
  // expected type of the returned value
  expectedReturnType: ReturnType.int256, // Change to ReturnType.Buffer
  // Secrets can be accessed within the source code with `secrets.varName` (ie: secrets.apiKey). The secrets object can only contain string values.
  secrets: {
    // DON level API Keys
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    twilioApiKey: process.env.TWILIO_API_KEY,
  },
  perNodeSecrets: [
    // Node level API Keys - 1 secrets object per node.
    {
      googleApiKey: process.env.GOOGLE_MAPS_API_KEY,
      twilioApiKey: process.env.TWILIO_API_KEY,
    },
    {
      googleApiKey: "",
      twilioApiKey: "",
    },
    {
      googleApiKey: "",
      twilioApiKey: "",
    },
    {
      googleApiKey: "",
      twilioApiKey: "",
    },
  ],
}

module.exports = requestConfig
