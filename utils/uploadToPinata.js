const pinataSDK = require('@pinata/sdk');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Pinata API credentials (pinata instance inicialization)
const pinataApiKey = process.env.PINATA_API_KEY;
const pinataApiSecret = process.env.PINATA_API_SECRET;
const pinata = new pinataSDK(pinataApiKey, pinataApiSecret);

async function storeImages(imagesFilePath) {
    const fullImagesPath = path.resolve(imagesFilePath); // getting full images path
    const files = fs.readdirSync(fullImagesPath); // read the entire dir of images
    // console.log(files);

    let responses = [];
    console.log('Uploading to Pinata!');
    for (fileIndex in files) {
        console.log(`Working on ${fileIndex}`);
        const readableStreamForFile = fs.createReadStream(`${fullImagesPath}/${files[fileIndex]}`); // create a read stream for each file
        const options = {
            pinataMetadata: {
                name: files[fileIndex],
            },
        };
        try {
            const response = await pinata.pinFileToIPFS(readableStreamForFile, options); // push the image to pinata IPFS node
            responses.push(response); // copy the responses to the array (the responses contain the hashes of the uploaded files that we will need them for the metadata)
        } catch (error) {
            console.log(error);
        }
    }

    return { responses, files };
}

async function storeTokenUriMetadata(metadata) {
    try {
        const response = await pinata.pinJSONToIPFS(metadata);
        return response;
    } catch (error) {
        console.log(error);
    }
    return null;
}

module.exports = { storeImages, storeTokenUriMetadata };
