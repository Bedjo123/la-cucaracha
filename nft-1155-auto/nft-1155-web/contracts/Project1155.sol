// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Project1155 is ERC1155, Ownable {
    string public projectName;
    string public projectDescription;

    string private _contractMetadataURI;

    uint256 public constant UNLIMITED =
        type(uint256).max;

    struct Item {
        uint256 maxSupply;
        uint256 minted;
        uint256 price;
        bool exists;
    }

    mapping(uint256 => Item) public items;
    mapping(uint256 => string) private _tokenURIs;

    constructor(
        string memory name_,
        string memory description_,
        string memory contractMetadataURI_,
        address creator_
    )
        ERC1155("")
        Ownable(creator_)
    {
        projectName = name_;
        projectDescription = description_;
        _contractMetadataURI = contractMetadataURI_;
    }

    function contractURI()
        external
        view
        returns (string memory)
    {
        return _contractMetadataURI;
    }

    function setContractMetadataURI(
        string calldata uri_
    ) external onlyOwner {
        _contractMetadataURI = uri_;
    }

    function setTokenURI(
        uint256 tokenId,
        string calldata uri_
    ) external onlyOwner {
        _tokenURIs[tokenId] = uri_;
    }

    function uri(
        uint256 tokenId
    )
        public
        view
        override
        returns (string memory)
    {
        return _tokenURIs[tokenId];
    }

    function createItem(
        uint256 tokenId,
        uint256 supply,
        uint256 price,
        string calldata metadataURI
    ) external onlyOwner {
        require(
            !items[tokenId].exists,
            "Item already exists"
        );

        require(
            supply > 0,
            "Invalid supply"
        );

        items[tokenId] = Item({
            maxSupply: supply,
            minted: 0,
            price: price,
            exists: true
        });

        _tokenURIs[tokenId] = metadataURI;
    }

    function updateItem(
        uint256 tokenId,
        uint256 supply,
        uint256 price,
        string calldata metadataURI
    ) external onlyOwner {
        require(
            items[tokenId].exists,
            "Item does not exist"
        );

        require(
            supply == UNLIMITED ||
            supply >= items[tokenId].minted,
            "Supply below minted"
        );

        items[tokenId].maxSupply = supply;
        items[tokenId].price = price;
        _tokenURIs[tokenId] = metadataURI;
    }

    function publicMint(
        uint256 tokenId,
        uint256 amount
    ) external payable {
        Item storage item = items[tokenId];

        require(
            item.exists,
            "Item does not exist"
        );

        require(
            amount > 0,
            "Invalid amount"
        );

        require(
            item.maxSupply == UNLIMITED ||
            item.minted + amount <= item.maxSupply,
            "Supply exceeded"
        );

        uint256 totalPrice =
            item.price * amount;

        require(
            msg.value == totalPrice,
            "Incorrect payment"
        );

        item.minted += amount;

        _mint(
            msg.sender,
            tokenId,
            amount,
            ""
        );
    }

    function creatorMintTo(
        address to,
        uint256 tokenId,
        uint256 amount
    ) external onlyOwner {
        require(
            to != address(0),
            "Invalid recipient"
        );

        Item storage item = items[tokenId];

        require(
            item.exists,
            "Item does not exist"
        );

        require(
            item.maxSupply == UNLIMITED ||
            item.minted + amount <= item.maxSupply,
            "Supply exceeded"
        );

        item.minted += amount;

        _mint(
            to,
            tokenId,
            amount,
            ""
        );
    }

    function creatorMintBatch(
        address[] calldata recipients,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(
            recipients.length == tokenIds.length &&
            tokenIds.length == amounts.length,
            "Length mismatch"
        );

        for (uint256 i = 0; i < recipients.length; i++) {
            require(
                recipients[i] != address(0),
                "Invalid recipient"
            );

            Item storage item = items[tokenIds[i]];

            require(
                item.exists,
                "Item does not exist"
            );

            require(
                item.maxSupply == UNLIMITED ||
                item.minted + amounts[i] <= item.maxSupply,
                "Supply exceeded"
            );

            item.minted += amounts[i];

            _mint(
                recipients[i],
                tokenIds[i],
                amounts[i],
                ""
            );
        }
    }

    function withdraw(
        address payable to
    ) external onlyOwner {
        require(
            to != address(0),
            "Invalid recipient"
        );

        uint256 balance = address(this).balance;

        require(
            balance > 0,
            "No funds"
        );

        (bool success, ) = to.call{
            value: balance
        }("");

        require(
            success,
            "Withdraw failed"
        );
    }

    receive() external payable {}
}
