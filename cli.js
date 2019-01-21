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
		let site = {
			url: await goodLib.validateUrl(args[0]),
			description: args[1]
		}
		// const url = await goodLib.validateUrl(args[0]);
		// const description = args[1];

		// Get meta information

		site = await goodLib.getMeta(site);
		// site.description = description;
		// site.url = url;

		// Screenshot the websites
		site = await goodLib.screenshot(site);
		site = await goodLib.uploadToImgur(site);
		site = await goodLib.addToAirtable(site);
		await goodLib.publishSite();
		await goodLib.deleteLocalFiles(site);

		console.log("All done.");

	} catch (e) {
		console.log(e.message);
	}
}

// sudoBlock();
(async () => {
	await init(cli.input);;
})();