const fs = require("fs");
const path = require("path");
const solc = require("solc");

const contractPath = path.join(
  __dirname,
  "contracts",
  "Project1155.sol"
);

const source = fs.readFileSync(contractPath, "utf8");

function findImports(importPath) {
  try {
    const fullPath = path.join(
      __dirname,
      "node_modules",
      importPath
    );

    return {
      contents: fs.readFileSync(fullPath, "utf8")
    };
  } catch (e) {
    return {
      error: `Import tidak ditemukan: ${importPath}`
    };
  }
}

const input = {
  language: "Solidity",
  sources: {
    "Project1155.sol": {
      content: source
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      "*": {
        "*": [
          "abi",
          "evm.bytecode.object"
        ]
      }
    }
  }
};

const output = JSON.parse(
  solc.compile(
    JSON.stringify(input),
    { import: findImports }
  )
);

if (output.errors) {
  let failed = false;

  for (const error of output.errors) {
    console.log(error.formattedMessage);

    if (error.severity === "error") {
      failed = true;
    }
  }

  if (failed) {
    process.exit(1);
  }
}

const contract =
  output.contracts["Project1155.sol"]["Project1155"];

fs.mkdirSync(
  path.join(__dirname, "src"),
  { recursive: true }
);

fs.writeFileSync(
  path.join(__dirname, "src", "contractData.js"),
  `export const ABI = ${JSON.stringify(
    contract.abi,
    null,
    2
  )};

export const BYTECODE = "${contract.evm.bytecode.object}";
`
);

console.log("================================");
console.log("CONTRACT COMPILED");
console.log("================================");
console.log("ABI + BYTECODE -> src/contractData.js");
console.log(
  "Bytecode length:",
  contract.evm.bytecode.object.length
);
