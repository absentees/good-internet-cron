require("dotenv").config();
require("babel-polyfill");
var Xray = require("x-ray");
var x = Xray();
var Metascraper = require("metascraper");
const fs = require("fs");
const os = require("os");
const path = require("path");
const axios = require("axios");
const imgur = require("imgur");
const slugify = require("slugify");
const chrome = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core'); // Use on prod
// const puppeteer = require('puppeteer'); // Use on local

const Airtable = require("airtable");
Airtable.configure({
	endpointUrl: "https://api.airtable.com",
	apiKey: process.env.GOOD_INTERNET_AIRTABLE_API_KEY
});
var base = Airtable.base(process.env.GOOD_INTERNET_BASE_ID);

const screenshotPath  = `${os.tmpdir()}/good-internet`;
fs.mkdir(screenshotPath, (err)=> {
	if (err) {
		throw err;
	}
});

export default class GoodLib {
	async validateUrl(url){
		const urlRegex = /https?:\/\/|localhost|\./;

		if (urlRegex.test(url)) {
			return Promise.resolve(url);
		} else {
			return Promise.reject("URL is no good, please try again.");
		}
	}
	async sortWebsites(allWebsites) {
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
	async scrapeDesignerNews() {
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
	}
	async getMeta(website) {
		console.log(`Getting meta information for: ${website.url}`);

		website = await Metascraper.scrapeUrl(website.url).then(metadata => {
			console.log(metadata);
			website.title = metadata.title;
			website.screenshots = [];
			website.screenshots.push({
				title: website.title,
				description: website.url,
				file: `${screenshotPath}/${slugify(website.title)}-desktop.jpg}`
			});
			website.screenshots.push({
				title: website.title,
				description: website.url,
				file: `${screenshotPath}/${slugify(website.title)}-mobile.jpg`
			});
			return website;
		});

		return Promise.resolve(website);
	}
	async screenshot(website) {
		console.log(`Taking screenshots of ${website.url}`);

		const browser = await puppeteer.launch({
			args: chrome.args,
			executablePath: await chrome.executablePath,
			headless: chrome.headless,
		});
		
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
	}
	async uploadToImgur(website) {
		console.log("Uploading images to Imgur");
		console.log(website);

		imgur.setCredentials(
			process.env.IMGUR_USER,
			process.env.IMGUR_PASSWORD,
			process.env.IMGUR_CLIENTID
		);

		let images = await imgur.uploadFile(
			`${screenshotPath}/*.jpg`,
			process.env.GOOD_INTERNET_IMGUR_ALBUM_ID
		);

		website.screenshotURLs = images.map(function (image) {
			console.log("Imgur image link: " + image.link);
			return image.link;
		});

		return Promise.resolve(website);
	}
	async addToAirtable(website) {
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
	}
	async deleteLocalFiles(website) {
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
	}
	async publishSite(website){
		console.log("Publishing site.");
		let response = await axios.post(process.env.NETLIFY_DEPLOY_HOOK);
		return Promise.resolve(response);
	}
};
