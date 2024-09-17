// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.8;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

contract BasicNft is ERC721 {
    string public constant TOKEN_URI =
        'ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json';
    uint256 private s_tokenCounter; // token ID

    constructor() ERC721('Dogie', 'DOG') {
        s_tokenCounter = 0;
    }

    // create new dogs (like ERC20 for creating new tokens but here with NFTs)
    // everybody who mints the NFT will have the same image (represented in TOKEN_URI)
    function mintNft() public returns (uint256) {
        _safeMint(msg.sender, s_tokenCounter); // we use the function from the ERC721
        s_tokenCounter = s_tokenCounter + 1;
        return s_tokenCounter;
    }

    // override the ERC721 tokenURI function so we can return our NFT
    function tokenURI(uint256 /*tokenId*/) public view override returns (string memory) {
        return TOKEN_URI;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
