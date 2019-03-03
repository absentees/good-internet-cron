#!/usr/bin/env node
import GoodLib from './good-lib';

export default async (req, res) => {
	try {
			let goodLib = new GoodLib();
			let websites = await goodLib.scrapeDesignerNews();
			let topWebsite = await goodLib.sortWebsites(websites);
			res.end(`<h1 style="font-family: sans-serif;">Good Internet Cron: ${topWebsite.url}</h1>`);
	} catch (error) {
		console.error(error);
	}
};
