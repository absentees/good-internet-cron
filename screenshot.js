#!/usr/bin/env node
import goodLib from "./good-lib";

// module.exports = async function (req, res) {
module.exports = async (req, res) => {
	try {
			let websites = await goodLib.scrapeDesignerNews();
			console.log(websites.length);
			// let topWebsite = await goodLib.sortWebsites(websites);
			// topWebsite = await goodLib.getMeta(topWebsite);
			// topWebsite = await goodLib.screenshot(topWebsite);
			// topWebsite = await goodLib.uploadToImgur(topWebsite);
			// topWebsite = await goodLib.addToAirtable(topWebsite);
			// await goodLib.deleteLocalFiles(topWebsite);
			// await goodLib.publishSite();
	} catch (error) {
		console.error(error);
	}
}


