const { assert, expect } = require('chai');
const { network, getNamedAccounts, deployments, ethers } = require('hardhat');
const { developmentChains, networkConfig } = require('../../helper-hardhat-config');
const { int } = require('hardhat/internal/core/params/argumentTypes');

!developmentChains.includes(network.name)
    ? describe.skip
    : describe('BasicNft', function () {
          let deployer, signer, basicNft;

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              signer = await ethers.getSigner(deployer);
              await deployments.fixture(['basicnft']); // deploy the basic NFT
              basicNft = await ethers.getContract('BasicNft', signer); // get the contract instance
          });

          describe('constructor', function () {
              it('Initializes the NFT correctly', async function () {
                  const name = await basicNft.name();
                  const symbol = await basicNft.symbol();
                  const tokenCounter = await basicNft.getTokenCounter();
                  assert.equal(name, 'Dogie');
                  assert.equal(symbol, 'DOG');
                  assert.equal(tokenCounter.toString(), '0');
              });
          });

          describe('Mint NFT', function () {
              beforeEach(async function () {
                  const tx = await basicNft.mintNft();
                  await tx.wait(1);
              });

              it('Allows the user to Mint an NFT', async function () {
                  const tokenURI = await basicNft.tokenURI(0);
                  const tokenCounter = await basicNft.getTokenCounter();

                  assert.equal(tokenCounter.toString(), '1');
                  assert.equal(tokenURI, await basicNft.TOKEN_URI());
              });

              it('Shows the correct balance and owner of an NFT', async function () {
                  const deployerAddress = signer.address;
                  const deployerBalance = await basicNft.balanceOf(deployerAddress); // returns the number of tokens in "owners" account
                  const nftOwner = await basicNft.ownerOf(0);

                  assert.equal(deployerBalance.toString(), '1');
                  assert.equal(nftOwner, deployerAddress);
              });
          });
      });
