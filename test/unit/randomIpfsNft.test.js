const { assert, expect } = require('chai');
const { network, getNamedAccounts, deployments, ethers } = require('hardhat');
const { developmentChains, networkConfig } = require('../../helper-hardhat-config');
const { int } = require('hardhat/internal/core/params/argumentTypes');

!developmentChains.includes(network.name)
    ? describe.skip
    : describe('RandomIpfsNft', function () {
          let deployer, signer, randomIpfsNft, vrfCoordinatorV2Mock, mintFee;
          const chainId = network.config.chainId;

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              signer = await ethers.getSigner(deployer);
              await deployments.fixture(['all']); // deploy the basic NFT
              randomIpfsNft = await ethers.getContract('RandomIpfsNft', signer); // get the contract instance
              vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock', signer); // get the contract instance
              mintFee = await randomIpfsNft.getMintFee();
          });

          describe('constructor', function () {
              it('Initializes the NFT correctly', async function () {
                  // check:
                  // token counter = 0
                  // initialized = true
                  // getDogTokenUris[0] includes "ipfs://"
                  const tokenCounter = await randomIpfsNft.getTokenCounter();
                  const isInitialized = await randomIpfsNft.getInitialized();
                  const dogTokenUrisZero = await randomIpfsNft.getDogTokenUris(0);
                  const dogTokenUrisOne = await randomIpfsNft.getDogTokenUris(1);
                  const dogTokenUrisTwo = await randomIpfsNft.getDogTokenUris(2);

                  assert.equal(tokenCounter.toString(), '0');
                  assert.equal(isInitialized, true);
                  assert(dogTokenUrisZero.includes('ipfs://'));
                  assert(dogTokenUrisOne.includes('ipfs://'));
                  assert(dogTokenUrisTwo.includes('ipfs://'));
              });
          });

          describe('requestNft', function () {
              it('reverts when you dont pay any amount', async function () {
                  await expect(randomIpfsNft.requestNft()).to.be.revertedWith(
                      'RandomIpfsNft__NeedMoreETHSent',
                  );
              });
              it('reverts when you dont pay enough amount', async function () {
                  await expect(
                      randomIpfsNft.requestNft({
                          value: mintFee.toString() - ethers.parseEther('0.001').toString(),
                      }),
                  ).to.be.revertedWith('RandomIpfsNft__NeedMoreETHSent');
              });
              it('Emits an event', async function () {
                  await expect(randomIpfsNft.requestNft({ value: mintFee.toString() })).to.emit(
                      randomIpfsNft,
                      'NftRequested',
                  );
              });
          });

          describe('fulfillRandomWords', function () {
              it('mints NFT after a random number is returned', async function () {
                  // we have to wait until the fulfillRandomWords emits its event (the NFT has been minted)
                  await new Promise(async (resolve, reject) => {
                      randomIpfsNft.once('NftMinted', async (tokenId, breed, minter) => {
                          try {
                              // tokenId = newTokenId + 1
                              // tokenUri = dogUri
                              // tokenIri contains ipfs://...
                              // minter = signer.address
                              const newTokenId = await randomIpfsNft.getTokenCounter();
                              const breedUri = await randomIpfsNft.getDogTokenUris(
                                  breed.toString(),
                              );

                              assert.equal(newTokenId, tokenId + 1);
                              assert.equal(breedUri.toString().includes('ipfs://'), true);
                              assert.equal(minter, signer.address);
                              resolve();
                          } catch (error) {
                              console.log(error);
                              reject(error);
                          }
                      });
                      // this code executes before the listener:
                      try {
                          const requestNftResponse = await randomIpfsNft.requestNft({
                              value: mintFee.toString(),
                          });
                          const requestNftReceipt = await requestNftResponse.wait(1);
                          // we have to manually execute fulfillRandomWords because we are on a developer chain and we have to emulate the chainlink node:
                          console.log(randomIpfsNft.address);
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              BigInt(requestNftReceipt.logs[1].topics[1]),
                              randomIpfsNft.address,
                          );
                      } catch (error) {
                          console.log(error);
                          reject(e);
                      }
                  });
              });
          });

          describe('getBreedFromModdenRng', function () {
              it('Should return pug if moddedRng is between 0-10', async function () {
                  const breed = await randomIpfsNft.getBreedFromModdenRng(7);
                  assert.equal(0, breed);
              });
              it('Should return pug if moddedRng is between 10-30', async function () {
                  const breed = await randomIpfsNft.getBreedFromModdenRng(21);
                  assert.equal(1, breed);
              });
              it('Should return pug if moddedRng is between 30-100', async function () {
                  const breed = await randomIpfsNft.getBreedFromModdenRng(77);
                  assert.equal(2, breed);
              });
              it('Should revert if moddedRng has a different value', async function () {
                  await expect(await randomIpfsNft.getBreedFromModdenRng(200)).to.be.revertedWith(
                      'RandomIpfsNft__RangeOutOfBounds',
                  );
              });
          });
      });
