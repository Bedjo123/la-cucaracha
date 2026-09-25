// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LaCucaracha1155 is ERC1155, Ownable {
    uint256 public constant TOKEN_ID = 1;
    uint256 public constant MAX_SUPPLY = 100;

    uint256 public totalMinted;

    string private constant METADATA_URI =
        "https://raw.githubusercontent.com/Bedjo123/la-cucaracha/main/metadata/1.json";

    string private constant CONTRACT_METADATA =
        "https://raw.githubusercontent.com/Bedjo123/la-cucaracha/main/metadata/contract.json";

    constructor(address creator) ERC1155("") Ownable(creator) {}

    function uri(uint256 id) public pure override returns (string memory) {
        require(id == TOKEN_ID, "Invalid token");
        return METADATA_URI;
    }

    function contractURI() external pure returns (string memory) {
        return CONTRACT_METADATA;
    }

    function mint(uint256 quantity) external {
        require(quantity > 0, "Quantity zero");
        require(totalMinted + quantity <= MAX_SUPPLY, "Sold out");

        totalMinted += quantity;
        _mint(msg.sender, TOKEN_ID, quantity, "");
    }

    function mintTo(address recipient, uint256 quantity) external {
        require(recipient != address(0), "Invalid recipient");
        require(quantity > 0, "Quantity zero");
        require(totalMinted + quantity <= MAX_SUPPLY, "Sold out");

        totalMinted += quantity;
        _mint(recipient, TOKEN_ID, quantity, "");
    }

    function mintToMany(
        address[] calldata recipients,
        uint256[] calldata quantities
    ) external {
        require(recipients.length == quantities.length, "Length mismatch");
        require(recipients.length > 0, "Empty");

        uint256 batchTotal;

        for (uint256 i = 0; i < quantities.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(quantities[i] > 0, "Quantity zero");
            batchTotal += quantities[i];
        }

        require(totalMinted + batchTotal <= MAX_SUPPLY, "Sold out");

        totalMinted += batchTotal;

        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], TOKEN_ID, quantities[i], "");
        }
    }
}
