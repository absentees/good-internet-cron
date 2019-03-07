#!/usr/bin/env node

import GoodLib from './good-lib';
const fs = require("fs");
const os = require("os");
const slugify = require("slugify");

export default async (req, res) => {
	try {
		const screenshotPath = `${os.tmpdir()}/good-internet`;
		fs.mkdir(screenshotPath, (err) => {
			if (err) {
				console.error(err);
			}
		});

		let goodLib = new GoodLib();
		let websites = await goodLib.scrapeDesignerNews();
		let topWebsite = await goodLib.sortWebsites(websites);
		topWebsite = await goodLib.screenshotURL(topWebsite.url, screenshotPath);
		let desktopImageLink = await goodLib.uploadToImgur(`${screenshotPath}/desktop.jpg`);
		let mobileImageLink = await goodLib.uploadToImgur(`${screenshotPath}/mobile.jpg`);
		topWebsite = await goodLib.addToAirtable(topWebsite.url, topWebsite.url, desktopImageLink, mobileImageLink);
		await goodLib.deleteFile(`${screenshotPath}/desktop.jpg`);
		await goodLib.deleteFile(`${screenshotPath}/mobile.jpg`);
		await goodLib.publishSite();
		res.end(`<h1 style="font-family: sans-serif;">Good Internet Cron: ${topWebsite.url}</h1>`);
	} catch (error) {
		console.error(error);
	}
};
