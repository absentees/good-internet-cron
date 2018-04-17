#!/usr/bin/env node

require("dotenv").config();
require("babel-polyfill");
var Xray = require("x-ray");
var x = Xray();
var Metascraper = require("metascraper");
const fs = require("fs");
const os = require("os");
const path = require("path");
const axios = require("axios");
var CronJob = require("cron").CronJob;
const imgur = require("imgur");
const puppeteer = require("puppeteer");
const slugify = require("slugify");

const Airtable = require("airtable");
Airtable.configure({
	endpointUrl: "https://api.airtable.com",
	apiKey: process.env.GOOD_INTERNET_AIRTABLE_API_KEY
});
var base = Airtable.base(process.env.GOOD_INTERNET_BASE_ID);

async function sortWebsites(allWebsites) {
	try {
		allWebsites = allWebsites.sort((a, b) => {
			return b.upvotes - a.upvotes;
		});

		// Only move on with the top website
		return Promise.resolve(allWebsites[0]);
	} catch (error) {
		return Promise.reject(error);
	}
}

async function scrapeDesignerNews() {
	let websites = await x(
		"https://www.designernews.co/badges/design",
		".story-list-item",
		[
			{
				url: ".montana-item-title@href",
				upvotes: ".upvoted-number"
			}
		]
	).then(function(res) {
		return res.map(website => {
			return {
				url: website.url,
				upvotes: parseInt(website.upvotes)
			};
		});
	});

	return Promise.resolve(websites);
}

async function getMeta(website) {
	website = await Metascraper.scrapeUrl(website.url).then(metadata => {
		website.title = metadata.title;
		website.screenshots = [];
		website.screenshots.push(`${__dirname + '/' + slugify(website.title)}-desktop.jpg`);
		website.screenshots.push(`${__dirname + '/' + slugify(website.title)}-mobile.jpg`);
		return website;
	});

	return Promise.resolve(website);
}

async function screenshot(website) {
	console.log(`Taking screenshots of ${website.url}`);

	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto(website.url, {
		waitUntil: 'networkidle0'
	});
	await page.setViewport({ width: 1280, height: 800 });
	await page.screenshot({
		path: website.screenshots[0],
		fullPage: true
	});
	await page.setViewport({ 
		width: 320, 
		height: 480,
		isMobile: true
	});
	await page.reload({
		waitUntil: 'networkidle0'
	})
	await page.screenshot({
		path: website.screenshots[1],
		fullPage: true
	});
	await browser.close();

	return Promise.resolve(website);
}

async function uploadToImgur(website) {
	console.log("Uploading images to Imgur");

	imgur.setCredentials(
		process.env.IMGUR_USER,
		process.env.IMGUR_PASSWORD,
		process.env.IMGUR_CLIENTID
	);

	console.log(website.screenshots);

	let images = await imgur.uploadImages(
		website.screenshots,
		"File",
		process.env.GOOD_INTERNET_IMGUR_ALBUM_ID
	);

	website.screenshotURLs = images.map(function(image) {
		console.log("Imgur image link: " + image.link);
		return image.link;
	});

	return Promise.resolve(website);
}

async function addToAirtable(website) {
	console.log("Uploading files");

	await base('Good').create({
		"Name": website.title,
		"URL": website.url,
		"Description": website.description,
		"Desktop Screenshot": [
		  {
			"url": website.screenshotURLs[0]
		  }
		],
		"Mobile Screenshot": [
		  {
			"url": website.screenshotURLs[1]
		  }
		]
	  });

	return Promise.resolve(website);
}

async function deleteLocalFiles(website) {
	await website.screenshots.forEach(function(path) {
		fs.unlink(path, err => {
			if (err) {
				console.error("Failed to delete local file: " + error);
			} else {
				console.log("Deleted local: " + path);
			}
		});
	});

	return Promise.resolve()

}

async function publishSite(website) {
	console.log("Publishing site.");

	let response = await axios
		.post(process.env.NETLIFY_DEPLOY_HOOK);

	return Promise.resolve(response);
}

(async () => {
	// var cronJob = new CronJob('0 * * * * *', function() {
	//var cronJob = new CronJob('0 0 */12 * * *', function() {
	let websites = await scrapeDesignerNews();
	let topWebsite = await sortWebsites(websites);
	topWebsite = await getMeta(topWebsite);
	topWebsite = await screenshot(topWebsite);
	topWebsite = await uploadToImgur(topWebsite);
	topWebsite = await addToAirtable(topWebsite);
	await deleteLocalFiles(topWebsite);
	await publishSite();
	// }, null, false, 'Australia/Sydney');

	// cronJob.start();
	// console.log("Job is: " + cronJob.running + " – checking for good internet daily.");

	// module.exports = (req, res) => {
	// 	res.end("Good Internet cron is: " + cronJob.running);
	// };
})();
