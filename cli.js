#!/usr/bin/env node
import goodLib from "./good-lib";
const meow = require('meow'); 

const cli = meow(`
	Will accept a single url to screenshot and post to goodinternet.online. That's it.

	Usage
		$ goodinternet <url> <description>

	Examples
		$ goodinternet http://google.com`);

async function init(args) {
	try {
		if (args.length === 0 || args.length < 2) {
			cli.showHelp(1);
		}

		// Check that the URL is good
		const url = await goodLib.validateUrl(args[0]);
		const description = args[1];

		// Get meta information
		const siteDetails = await goodLib.getMeta({url: url});
		let screenshots;

		// Screenshot the websites
		if (siteDetails.url == null) {
			screenshots = await goodLib.screenshot(url);
		} else {
			screenshots = await goodLib.screenshot(siteDetails.url);
		}

		// Upload to Imgur
		let imgurURLs = await goodLib.uploadToImgur(screenshots);

		// Upload to CMS
		let record = await goodLib.uploadToCMS(siteDetails,url,description,imgurURLs);

		// Hit Netlify hook
		let deployed = await goodLib.publishSite();
		console.log("All done.");

		// Delete local screenshot files
		goodLib.deleteLocalFiles(screenshots);


	} catch (e) {
		console.log(e.message);
	}
}


// sudoBlock();
(async () => {
    await init(cli.input);;
})();
