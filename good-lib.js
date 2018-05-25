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
const imgur = require("/Users/scott-presco/GitHub/node-imgur/");
const puppeteer = require("puppeteer");
const slugify = require("slugify");

const Airtable = require("airtable");
Airtable.configure({
	endpointUrl: "https://api.airtable.com",
	apiKey: process.env.GOOD_INTERNET_AIRTABLE_API_KEY
});
var base = Airtable.base(process.env.GOOD_INTERNET_BASE_ID);

export default {
	validateUrl: async function (url) {
		const urlRegex = /https?:\/\/|localhost|\./;

		if (urlRegex.test(url)) {
			return Promise.resolve(url);
		} else {
			return Promise.reject("URL is no good, please try again.");
		}
	},
	sortWebsites: async allWebsites => {
		try {
			allWebsites = allWebsites.sort((a, b) => {
				return b.upvotes - a.upvotes;
			});

			// Only move on with the top website
			return Promise.resolve(allWebsites[0]);
		} catch (error) {
			return Promise.reject(error);
		}
	},
	scrapeDesignerNews: async () => {
		let websites = await x(
			"https://www.designernews.co/badges/design",
			".story-list-item", [{
				url: ".montana-item-title@href",
				upvotes: ".upvoted-number"
			}]
		).then(function (res) {
			return res.map(website => {
				return {
					url: website.url,
					upvotes: parseInt(website.upvotes)
				};
			});
		});

		return Promise.resolve(websites);
	},
	getMeta: async website => {
		console.log(`Getting meta information for: ${website.url}`);

		website = await Metascraper.scrapeUrl(website.url).then(metadata => {
			console.log(metadata);
			website.title = metadata.title;
			website.screenshots = [];
			website.screenshots.push({
				title: website.title,
				description: website.url,
				file: `${os.tmpdir() +
					"/" +
					slugify(website.title)}-desktop.jpg`
			});
			website.screenshots.push({
				title: website.title,
				description: website.url,
				file: `${os.tmpdir() + "/" + slugify(website.title)}-mobile.jpg`
			});
			return website;
		});

		return Promise.resolve(website);
	},
	screenshot: async website => {
		console.log(`Taking screenshots of ${website.url}`);

		// For debian docker image
		// const browser = await puppeteer.launch({
		// 	executablePath: '/usr/bin/chromium-browser',
		// 	args: ['--no-sandbox', '--headless', '--disable-gpu']
		// });
		const browser = await puppeteer.launch();

		const page = await browser.newPage();
		await page.goto(website.url, {
			waitUntil: "networkidle0"
		});
		await page.setViewport({
			width: 1280,
			height: 800
		});
		await page.screenshot({
			path: website.screenshots[0].file,
			fullPage: true,
			type: "jpeg"
		});
		await page.setViewport({
			width: 320,
			height: 480,
			isMobile: true
		});
		await page.reload({
			waitUntil: "networkidle0"
		});
		await page.screenshot({
			path: website.screenshots[1].file,
			fullPage: true,
			type: "jpeg"
		});
		await browser.close();

		return Promise.resolve(website);
	},
	uploadToImgur: async website => {
		console.log("Uploading images to Imgur");

		imgur.setCredentials(
			process.env.IMGUR_USER,
			process.env.IMGUR_PASSWORD,
			process.env.IMGUR_CLIENTID
		);

		let images = await imgur.uploadImages(
			website.screenshots,
			"File",
			process.env.GOOD_INTERNET_IMGUR_ALBUM_ID
		);

		website.screenshotURLs = images.map(function (image) {
			console.log("Imgur image link: " + image.link);
			return image.link;
		});

		return Promise.resolve(website);
	},
	addToAirtable: async website => {
		console.log("Uploading files");

		await base("Good").create({
			Name: website.title,
			URL: website.url,
			Description: website.description,
			"Desktop Screenshot": [{
				url: website.screenshotURLs[0]
			}],
			"Mobile Screenshot": [{
				url: website.screenshotURLs[1]
			}]
		});

		return Promise.resolve(website);
	},
	deleteLocalFiles: async website => {
		await website.screenshots.forEach(function (screenshot) {
			fs.unlink(screenshot.file, err => {
				if (err) {
					console.error("Failed to delete local file: " + error);
				} else {
					console.log("Deleted local: " + screenshot.file);
				}
			});
		});

		return Promise.resolve();
	},
	publishSite: async website => {
		console.log("Publishing site.");
		let response = await axios.post(process.env.NETLIFY_DEPLOY_HOOK);
		return Promise.resolve(response);
	}
};