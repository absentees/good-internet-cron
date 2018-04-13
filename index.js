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

const Airtable = require("airtable");
Airtable.configure({
	endpointUrl: "https://api.airtable.com",
	apiKey: process.env.GOOD_INTERNET_AIRTABLE_API_KEY
});
var base = Airtable.base(process.env.GOOD_INTERNET_BASE_ID);

async function sortWebsites(allWebsites) {
	allWebsites.sort((a, b) => {
		return b.upvotes - a.upvotes;
	});

	// Only move on with the top website
	return Promise.resolve(allWebsites[0]);
}

async function scrapeDesignerNews() {
	x("https://www.designernews.co/badges/design", ".story-list-item", [
		{
			url: ".montana-item-title@href",
			upvotes: ".upvoted-number"
		}
	])(function(err, allWebsites) {
		if (err) {
			console.error(err);
		}

		allWebsites.map(website => {
			return {
				url: website.url,
				upvotes: parseInt(website.upvotes)
			};
		});

	});

	let allWebsites = await x("https://www.designernews.co/badges/design", ".story-list-item", [
		{
			url: ".montana-item-title@href",
			upvotes: ".upvoted-number"
		}
	]);

	allWebsites.map(website => {
		return {
			url: website.url,
			upvotes: parseInt(website.upvotes)
		};
	});

}

function getMeta(website, callback) {
	Metascraper.scrapeUrl(website.url).then(metadata => {
		website.title = metadata.title;
		return website;
	});

	callback(null, website);
}

function screenshot(website, callback) {
	console.log(`Taking screenshots of ${website.url}`);

	puppeteer.launch().then(browser => {
		browser
			.newPage()
			.then(page => {
				page.goto(website.url);
				page.setViewport({ width: 1280, height: 800 });
				page.screenshot({
					path: `${os.tmpdir()}/${website.title}.jpg`,
					fullPage: false
				});
			})
			.then(buffer => buffer.close())
			.then(() => callback(null, website))
			.catch(err => callback(err));
	});
	// puppeteer.launch()
	// 	.then(browser => browser.newPage())
	// 	.then(page => {
	// 		page.goto(website.url);
	// 		page.setViewport({ width: 1280, height: 800 });
	// 	})
	// 	.then(buffer => browser.close());

	// const browser = await puppeteer.launch();
	// const page = await browser.newPage();
	// await page.goto(website.url);
	// await page.setViewport({ width: 1280, height: 800 });
	// await page.screenshot({
	// 	path: `${os.tmpdir()}/${website.title}.jpg`,
	// 	fullPage: false
	// });
	// await browser.close();

	// const pageres = new Pageres({
	// 		delay: 10
	// 	})
	// 	.src(website.url, screenshotSizes, {
	// 		crop: true,
	// 		format: "jpg"
	// 	})
	// 	.dest(os.tmpdir())
	// 	.run()
	// 	.then((streams) => {

	// 		var screenshots = streams.map(function (stream) {
	// 			return stream.filename
	// 		});

	// 		website.screenshots = screenshots;

	// 		callback(null, website);
	// 	}).catch((err) => {
	// 		callback(err);
	// 	});
}

function uploadToImgur(website, callback) {
	console.log("Uploading images to Imgur");

	imgur.setCredentials(
		process.env.IMGUR_USER,
		process.env.IMGUR_PASSWORD,
		process.env.IMGUR_CLIENTID
	);

	console.log(website.screenshots);

	// Upload images to imgur good internet folder
	imgur
		.uploadImages(
			website.screenshots,
			"File",
			process.env.GOOD_INTERNET_IMGUR_ALBUM_ID
		)
		.then(function(images) {
			website.screenshotURLs = images.map(function(image) {
				console.log("Imgur image link: " + image.link);
				return image.link;
			});
			callback(null, website);
		})
		.catch(function(err) {
			callback(err);
		});
}

function addToAirtable(website, callback) {
	console.log("Uploading files");

	base("Good").create(
		{
			Name: website.name,
			URL: website.url,
			Description: website.description,
			"Desktop Screenshot": [
				{
					url: website.screenshotURLs[0]
				}
			],
			"Mobile Screenshot": [
				{
					url: website.screenshotURLs[1]
				}
			]
		},
		function(err, website) {
			if (err) {
				console.log(`Something went wrong creating website: ${err}`);
				callback(err);
			}
			callback(null, website);
		}
	);
}

function deleteLocalFiles(website, callback) {
	website.screenshots.forEach(function(path) {
		fs.unlink(path, err => {
			if (err) {
				console.error("Failed to delete local file: " + error);
			} else {
				console.log("Deleted local: " + path);
			}
		});
	});

	callback(null, website);
}

function publishSite(website, callback) {
	console.log("Publishing site.");

	axios
		.post(process.env.NETLIFY_DEPLOY_HOOK)
		.then(res => {
			callback(null, "Published.");
		})
		.catch(err => {
			callback(err);
		});
}

// var cronJob = new CronJob('0 * * * * *', function() {
//var cronJob = new CronJob('0 0 */12 * * *', function() {

// Check sites once a day

// scrapeDesignerNews,
// 	sortWebsites,
// 	getMeta,
// 	screenshot,
	// uploadToImgur,
	// addToAirtable,
	// deleteLocalFiles;
// publishSite
// }, null, false, 'Australia/Sydney');

// cronJob.start();
// console.log("Job is: " + cronJob.running + " – checking for good internet daily.");

// // same
// const run = () => console.log(‘running’);
// run();

(async () => {
	// var cronJob = new CronJob('0 * * * * *', function() {
	//var cronJob = new CronJob('0 0 */12 * * *', function() {
	let websites = await scrapeDesignerNews();
	let topWebsite = await sortWebsites(websites);
	consoloe.log(topWebsite);
	// topWebsite = await getMeta(topWebsite)
	// topWebsite = await screenshot(topWebsite);
	// 	// await uploadToImgur,
	// 	// await addToAirtable,
	// 	await deleteLocalFiles(topWebsite);
	// await publishSite
	// }, null, false, 'Australia/Sydney');

	// cronJob.start();
	// console.log("Job is: " + cronJob.running + " – checking for good internet daily.");

	module.exports = (req, res) => {
		res.end("Good Internet cron is: " + cronJob.running);
	};
})();
