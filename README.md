# Hardhat NFT

This repo contains the creation of 3 types of NFTs:
1. A Basic NFT
2. IPFS Hosted NFT
    - That uses Randomness to generate a unique NFT
2. SVG NFT (Hosted 100% on-chain)
    - Uses price feeds to be dynamic

## Quickstart

```sh
git clone https://github.com/Trigii/hardhat-nft
cd hardhat-nft-fcc
yarn
```

## Usage

Deploy:
```sh
yarn hardhat deploy
```

## Testing

```sh
yarn hardhat test
```

## Test Coverage
```sh
yarn hardhat coverage
```

## Deployment to a testnet or mainnet

1. Setup environment variables

You'll want to set your `SEPOLIA_RPC_URL` and `PRIVATE_KEY` as environment variables. You can add them to a `.env` file, similar to what you see in `.env.example`.

- `PRIVATE_KEY`: The private key of your account (like from metamask). NOTE: FOR DEVELOPMENT, PLEASE USE A KEY THAT DOESN'T HAVE ANY REAL FUNDS ASSOCIATED WITH IT.

- `SEPOLIA_RPC_URL`: This is url of the sepolia testnet node you're working with. You can get setup with one for free from Alchemy

2. Get testnet ETH

Head over to [faucets.chain.link](https://faucets.chain.link) and get some tesnet ETH & LINK. You should see the ETH and LINK show up in your metamask.

3. Setup a Chainlink VRF Subscription ID

Head over to [vrf.chain.link](https://vrf.chain.link) and setup a new subscription, and get a subscriptionId. You can reuse an old subscription if you already have one.

You should leave this step with:

1. A subscription ID
2. Your subscription should be funded with LINK
3. Deploy

In your `helper-hardhat-config.js` add your `subscriptionId` under the section of the chainId you're using (aka, if you're deploying to sepolia, add your subscriptionId in the subscriptionId field under the 11155111 section.)

Then run:

```sh
yarn hardhat deploy --network sepolia --tags main
```

We only deploy the `main` tags, since we need to add our `RandomIpfsNft` contract as a consumer.

4. Add your contract address as a Chainlink VRF Consumer

Go back to [vrf.chain.link](https://vrf.chain.link) and under your subscription add `Add consumer` and add your contract address. You should also fund the contract with a minimum of 1 LINK.

5. Mint NFTs

Then run:

```sh
yarn hardhat deploy --network sepolia --tags mint
```