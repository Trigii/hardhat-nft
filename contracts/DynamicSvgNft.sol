// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.8;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol';
import 'base64-sol/base64.sol';

contract DynamicSvgNft is ERC721 {
    // variables
    uint256 s_tokenCounter;
    string private i_lowImageURI;
    string private i_highImageURI;
    string private constant base64EncodedSvgPrefix = 'data:image/svg+xml;base64,';
    AggregatorV3Interface internal immutable i_priceFeed;
    mapping(uint256 => int256) public s_tokenIdToHighValue;

    event DynamicSvgNft__CreatedNFT(uint256 indexed tokenId, int256 highValue);

    constructor(
        address priceFeedAddress,
        string memory lowSvg,
        string memory highSvg
    ) ERC721('Dynamic SVG NFT', 'DSN') {
        s_tokenCounter = 0;
        i_lowImageURI = svgToImageURI(lowSvg);
        i_highImageURI = svgToImageURI(highSvg);
        i_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    // Steps:
    // 1. Base64 encode the NFT image and create the image URL
    // 2. Stick the image URL into the JSON metadata (image field)
    // 3. Base64 encode the JSON so its the URI that the token uses (tokenUri)

    // function that converts SVG images into an image URI (conversion is done on-chain encoding in base64 and using the URL data:image/svg+xml;base64,BASE64_ENCODED_SVG)
    // abi.encode -> abi-encodes in base64 strigs, numbers... (it takes a lot of space); we can decode it with abi.decode(abi.encode(X))
    // abi.encodePacked -> abi-encodes 1 or 2 strings together into its byte form (returns a byte object); takes less space -> we consume less gas (its very similar to type casting -> if we want to decode it, just type cast to string -> string(abi.encodedPacked(X)))
    function svgToImageURI(string memory svg) public pure returns (string memory) {
        string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(svg)))); // abi-encode the svg -> encode it in base64
        return string(abi.encodePacked(base64EncodedSvgPrefix, svgBase64Encoded)); // abi-encode the concatenation of the prefix + base64 encoded svg; then decode it to string (basically we are concatenating strings)
    }

    // mint function to mint the NFTs
    /**
     * @param highValue: value selected by the user when minting an NFT. If the priceFeed of the asset is lower than the highValue, it will mint the low NFT and vice-versa.
     */
    function mintNft(int256 highValue) public {
        s_tokenIdToHighValue[s_tokenCounter] = highValue; // when user mints an NFT they choose what is the high value
        s_tokenCounter = s_tokenCounter + 1; // increment the token counter
        _safeMint(msg.sender, s_tokenCounter); // mint the NFT

        // What the token is going to look like?
        // We want it to look like SVGs based on the price feed
        emit DynamicSvgNft__CreatedNFT(s_tokenCounter, highValue);
    }

    // baseURI for JSON
    function _baseURI() internal pure override returns (string memory) {
        return 'data:application/json;base64,';
    }

    // returns a base64 encoded version of the JSON
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        // require(_exists(tokenId), "URI Query for nonexistent token");
        string memory imageURI = i_lowImageURI;

        (, int256 price, , , ) = i_priceFeed.latestRoundData();
        if (price >= s_tokenIdToHighValue[tokenId]) {
            imageURI = i_highImageURI;
        }

        // concatenate the JSON with encodePacked + encode it in base64 with Base64.encode + concatenate with the base URL with string(abi.encodePacked(X))
        // data:application/json;base64,
        // Steps:
        // 1. Create a JSON string
        // 2. Encode it in bytes
        // 3. Encode it in Base64
        // 4. Concatenate the base URI but for JSON objects
        // 5. Cast the URI to string
        return
            string(
                abi.encodePacked(
                    _baseURI(),
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"',
                                name(),
                                '", "description":"An NFT that changes based on the Chainlink Feed", ',
                                '"attributes": [{"trait_type": "coolness", "value": 100}], "image":"',
                                imageURI,
                                '"}'
                            )
                        )
                    )
                )
            );
    }

    // store our SVG information somewhere

    // some logic to say "Show X Image" or "Show Y Image"

    function getLowSVG() public view returns (string memory) {
        return i_lowImageURI;
    }

    function getHighSVG() public view returns (string memory) {
        return i_highImageURI;
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return i_priceFeed;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
