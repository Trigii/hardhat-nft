const { ethers, network } = require('hardhat');
const { developmentChains } = require('../helper-hardhat-config');

module.exports = async function ({ getNamedAccounts }) {
    const { deployer } = await getNamedAccounts();

    // Basic NFT
    const basicNft = await ethers.getContract('BasicNft', deployer);
    const basicMintTx = await basicNft.mintNft();
    await basicMintTx.wait(1);
    console.log(`Basic NFT index 0 has tokenURI: ${await basicNft.tokenURI(0)}`);

    // Random IPFS NFT
    const randomIpfsNft = await ethers.getContract('RandomIpfsNft', deployer);
    const mintFee = await randomIpfsNft.getMintFee();

    await new Promise(async (resolve, reject) => {
        setTimeout(resolve, 300000); // 5 minutes
        randomIpfsNft.once('NftMinted', async function () {
            resolve();
        });
        const randomIpfsMintTx = await randomIpfsNft.requestNft({ value: mintFee.toString() });
        randomIpfsMintTxReceipt = await randomIpfsMintTx.wait(1);

        // if we are on a testnet we have to pretend to be the mocks
        if (developmentChains.includes(network.name)) {
            const requestId = BigInt(randomIpfsMintTxReceipt.logs[1].topics[1]);
            console.log(requestId);
            const vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock', deployer);
            await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, randomIpfsNft.address);
        }
    });
    console.log(`Random IPFS NFT index 0 has tokenURI: ${await randomIpfsNft.tokenURI(0)}`);

    // Dynamic SVG NFT
    const highValue = ethers.parseEther('4000');
    const dynamicSvgNft = await ethers.getContract('DynamicSvgNft', deployer);
    const dynamicSvgMintTx = await dynamicSvgNft.mintNft(highValue.toString());
    await dynamicSvgMintTx.wait(1);
    console.log(`Random IPFS NFT index 0 has tokenURI: ${await dynamicSvgNft.tokenURI(0)}`);
};

module.exports.tags = ['all', 'mint'];
