// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.8;

import {VRFConsumerBaseV2Plus} from '@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol';
import {VRFV2PlusClient} from '@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';

error RandomIpfsNft__AlreadyInitialized();
error RandomIpfsNft__RangeOutOfBounds();
error RandomIpfsNft__NeedMoreETHSent();
error RandomIpfsNft__TransferFailed();

contract RandomIpfsNft is VRFConsumerBaseV2Plus, ERC721URIStorage {
    // instead of minting any NFT:
    // 1. when we mint an NFT we will trigger a Chainlink VRF call to get us a random number
    // 2. using that random number, we will get a random NFT
    // 3. Options: Pug (super rare), Shiba Inu (rare), St. Bernard (common)

    // users have to pay to mint an NFT
    // the owner of the contract can withdraw the ETH

    // ---------------------------- TYPE DECLARATIONS ---------------------------- //
    enum Breed {
        PUG,
        SHIBA_INU,
        ST_BERNARD
    }

    // ---------------------------- VARIABLES ---------------------------- //
    // Chainlink VRF variables
    uint256 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // VRF Helpers
    mapping(uint256 => address) public s_requestIdToSender; // mapping between requestId -> senderAddress (we use this to keep track of who requested an NFT and the random number returned by fulfillRandomWords when its called by the chainlink node)

    // NFT Variables
    uint256 public s_tokenCounter;
    uint256 internal constant MAX_CHANCE_VALUE = 100;
    string[] internal s_dogTokenUris;
    uint256 internal i_mintFee;
    bool private s_initialized;

    // Events
    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(uint256 indexed tokenId, Breed dogBreed, address minter);

    constructor(
        address vrfCoordinatorV2,
        uint256 subscriptionId,
        bytes32 gasLane,
        uint32 callbackGasLimit,
        string[3] memory dogTokenUris,
        uint256 mintFee
    ) VRFConsumerBaseV2Plus(vrfCoordinatorV2) ERC721('Random IPFS NFT', 'RIN') {
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        s_tokenCounter = 0;
        i_mintFee = mintFee;
        _initializeContract(dogTokenUris);
    }

    // ---------------------------- FUNCTIONS ---------------------------- //

    // When we request a random number for our NFT it will happen in 2 transactions:
    // 1. requestNft(): request the random number
    // 2. fulfillRandomWords: fulfill the random number (called by the chainlink node -> msg.sender will be the chainlink node there)
    // requests a random number to get a random NFT
    function requestNft() public payable returns (uint256 requestId) {
        // people have to pay in order to mint an NFT
        if (msg.value < i_mintFee) {
            revert RandomIpfsNft__NeedMoreETHSent();
        }
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: i_gasLane,
                subId: i_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: i_callbackGasLimit,
                numWords: NUM_WORDS,
                // Set nativePayment to true to pay for VRF requests with Sepolia ETH instead of LINK
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );
        s_requestIdToSender[requestId] = msg.sender; // here the msg.sender is the user who really called the requestNft. If we use msg.sender in the fulfillRandomWords, it will be the chainlink node because the function is called by the node.
        emit NftRequested(requestId, msg.sender);
    }

    // function called by the chainlink node once the random number has been generated. It will calculate the NFT of the user based on the random number and mint the NFT
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        // to mint an NFT we need the address of the user + token counter
        // the address is stored in requestNft and mapped to the requestId (this function will be called by the chainlink node with the corresponding requestId so we have access to it)
        // the token counter is a storage variable
        address dogOwner = s_requestIdToSender[requestId]; // retrieve the user using the requestId
        uint256 newTokenId = s_tokenCounter; // retrieve the tokenId

        // What does the NFT look like?
        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE; // calculate the % number. We always will get a number between 0-99 (based on the value range we will get one dog or another)

        Breed dogBreed = getBreedFromModdenRng(moddedRng); // get the type of dog that the user minted

        s_tokenCounter += s_tokenCounter; // increment the tokenId
        _safeMint(dogOwner, newTokenId); // mint the NFT
        _setTokenURI(newTokenId, s_dogTokenUris[uint256(dogBreed)]); // get the token URI from the array specified on the constructor. We retrieve the index from the Breed structure
        emit NftMinted(newTokenId, dogBreed, dogOwner);
    }

    // only owner comes from openzeppelin Ownable contract
    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance; // get contract balance
        (bool success, ) = payable(msg.sender).call{value: amount}(''); //
        if (!success) {
            revert RandomIpfsNft__TransferFailed();
        }
    }

    // function that calculates the type of NFT that is going to be minted by the user based on the random number
    function getBreedFromModdenRng(uint256 moddedRng) public pure returns (Breed) {
        uint256 cumulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray();

        for (uint256 i = 0; i < chanceArray.length; i++) {
            if (moddedRng >= cumulativeSum && moddedRng < cumulativeSum + chanceArray[i]) {
                return Breed(i);
            }
            cumulativeSum += chanceArray[i];
        }
        revert RandomIpfsNft__RangeOutOfBounds();
    }

    // function that represents the different chances of the different dogs (rarity)
    function getChanceArray() public pure returns (uint256[3] memory) {
        // [0-10] -> PUG
        // [10-30] -> Shiba Inu
        // [30-100] -> St. Bernard
        return [10, 30, MAX_CHANCE_VALUE]; // index 0 -> 10% chance of happening; index 1 -> 20% chance of happening (30-10); index 2 -> 60% chance of happening (100-30-10);
    }

    function _initializeContract(string[3] memory dogTokenUris) private {
        if (s_initialized) {
            revert RandomIpfsNft__AlreadyInitialized();
        }
        s_dogTokenUris = dogTokenUris;
        s_initialized = true;
    }

    function getMintFee() public view returns (uint256) {
        return i_mintFee;
    }

    function getDogTokenUris(uint256 index) public view returns (string memory) {
        return s_dogTokenUris[index];
    }

    function getInitialized() public view returns (bool) {
        return s_initialized;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
