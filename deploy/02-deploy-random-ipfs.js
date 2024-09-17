const { network, ethers } = require('hardhat');
const { developmentChains, networkConfig } = require('../helper-hardhat-config');
const { verify } = require('../utils/verify');
const { storeImages, storeTokenUriMetadata } = require('../utils/uploadToPinata');

const imagesLocation = './images/randomNft';

const metadataTemplate = {
    name: '',
    description: '',
    image: '',
    attributes: [
        {
            trait_type: 'cuteness',
            value: 100,
        },
    ],
};

let tokenUris = [
    'ipfs://QmQs4yASJakykKzcUYiJoQEFptCuufghNA3S5J2CkD47tp',
    'ipfs://QmXry9jwWVKfbt6V87Gzd97WJ5LGAmtyWY7znSQXCRysv9',
    'ipfs://QmX5V7Xc31vMfM8tYgrNefix1WCFmiMqpLzjDtk6PgTQd2',
];

const FUND_AMOUNT = ethers.parseEther('2'); // amount of link that we are going to use to fund the VRF subscription to be able to generate random numbers

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    // get the IPFS hashes of our images
    // 1. With our IPFS node.
    // 2. Pinata (centralized)
    // 3. nft.storage (decentralized)
    if (process.env.UPLOAD_TO_PINATA == 'true') {
        tokenUris = await handleTokenUris();
    }

    let vrfCoordinatorV2Address, subscriptionId;

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock');
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.target;
        // console.log(`vrfCoordinatorV2Address = ${vrfCoordinatorV2Address}`);
        const tx = await vrfCoordinatorV2Mock.createSubscription();
        const txReceipt = await tx.wait(1);
        subscriptionId = BigInt(txReceipt.logs[0].topics[1]); // extract the subscription ID from the last emitted event
        // Fund the subscription
        // On a real network, we need to fund it with Link
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2;
        subscriptionId = networkConfig[chainId].subscriptionId;
    }

    log('----------------------------');
    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId].gasLane,
        networkConfig[chainId].callbackGasLimit,
        tokenUris,
        networkConfig[chainId].mintFee,
    ];
    const randomIpfsNft = await deploy('RandomIpfsNft', {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(randomIpfsNft.address, args);
    }
    log('----------------------------');
};

// uploads to Pinata
async function handleTokenUris() {
    tokenUris = [];

    // store the image in Pinata / IPFS
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation);

    // store the metadata in Pinata / IPFS
    for (imageUploadResponseIndex in imageUploadResponses) {
        // create the metadata
        let tokenUriMetadata = { ...metadataTemplate }; // ... -> stick the template into the variable
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace('.png', ''); // the name = filename without the extension
        tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup!`;
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`;
        console.log(`Uploading ${tokenUriMetadata.name}...`);

        // upload the metadata (store the JSON to pinata / IPFS)
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata);

        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`); // we store in the array the IPFS hashes that points to the metadata, and each metadata has the image field that contains the IPFS hash that points to the image
    }
    console.log('Token URIs Uploaded:');
    console.log(tokenUris);
    return tokenUris;
}

module.exports.tags = ['all', 'randomipfs', 'main'];
