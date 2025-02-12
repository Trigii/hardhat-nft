const { network, ethers } = require('hardhat');
const { developmentChains, networkConfig } = require('../helper-hardhat-config');
const { verify } = require('../utils/verify');
const fs = require('fs');

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    let ethUsdPriceFeedAddress;

    if (developmentChains.includes(network.name)) {
        const EthUsdAggregator = await ethers.getContract('MockV3Aggregator');
        ethUsdPriceFeedAddress = EthUsdAggregator.target;
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed;
    }

    log('----------------------------');

    const lowSVG = await fs.readFileSync('./images/dynamicNft/frown.svg', { encoding: 'utf8' });
    const highSVG = await fs.readFileSync('./images/dynamicNft/happy.svg', { encoding: 'utf8' });

    args = [ethUsdPriceFeedAddress, lowSVG, highSVG];
    const dynamicSvgNft = await deploy('DynamicSvgNft', {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(dynamicSvgNft.address, args);
    }
    log('----------------------------');
};

module.exports.tags = ['all', 'dynamicsvg', 'main'];
