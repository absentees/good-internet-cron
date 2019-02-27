#!/usr/bin/env node
import GoodLib from './good-lib';

export default async (req, res) => {
	try {
			let goodLib = new GoodLib();
			let websites = await goodLib.scrapeDesignerNews();
			// res.end(`<h1 style="font-family: sans-serif;">Good Internet Cron: ${websites[0].url}</h1>`);
			let topWebsite = await goodLib.sortWebsites(websites);
			topWebsite = await goodLib.getMeta(topWebsite);
			topWebsite = await goodLib.screenshot(topWebsite);
			topWebsite = await goodLib.uploadToImgur(topWebsite);
			topWebsite = await goodLib.addToAirtable(topWebsite);
			await goodLib.deleteLocalFiles(topWebsite);
			await goodLib.publishSite();
			res.end(`<h1 style="font-family: sans-serif;">Good Internet Cron: ${topWebsite.url}</h1>`)
	} catch (error) {
		console.error(error);
	}
};
