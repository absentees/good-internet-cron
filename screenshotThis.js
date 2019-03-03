#!/usr/bin/env node
import GoodLib from './good-lib';
const fs = require("fs");
const os = require("os");
const slugify = require("slugify");

export default async (req, res) => {
	try {
			const screenshotPath  = `${os.tmpdir()}/good-internet`;
			fs.mkdir(screenshotPath, (err)=> {
				if (err) {
					console.errer(err);
				}
			});

			let goodLib = new GoodLib();
			topWebsite.screenshots = [];
			topWebsite.screenshotURLs = [];
			topWebsite.screenshots.push({
				title: topWebsite.title,
				description: topWebsite.url,
				file: `${screenshotPath}/${slugify(topWebsite.title)}-desktop.jpg}`
			});
			topWebsite.screenshots.push({
				title: topWebsite.title,
				description: topWebsite.url,
				file: `${screenshotPath}/${slugify(topWebsite.title)}-mobile.jpg`
			});
			topWebsite = await goodLib.screenshot(topWebsite);
			topWebsite.screenshotURLs.push(await goodLib.uploadToImgur(topWebsite.screenshots[0].file));
			topWebsite.screenshotURLs.push(await goodLib.uploadToImgur(topWebsite.screenshots[1].file));
			topWebsite = await goodLib.addToAirtable(topWebsite);
			await goodLib.deleteLocalFiles(topWebsite);
			await goodLib.publishSite();
			res.end(`<h1 style="font-family: sans-serif;">Good Internet Cron: ${topWebsite.url}</h1>`)
	} catch (error) {
		console.error(error);
	}
};
