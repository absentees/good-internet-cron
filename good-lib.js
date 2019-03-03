require("dotenv").config();
require("babel-polyfill");
var Xray = require("x-ray");
var x = Xray();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const imgur = require("imgur");
const chrome = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core'); // Use on prod
// const puppeteer = require('puppeteer'); // Use on local

const Airtable = require("airtable");
Airtable.configure({
	endpointUrl: "https://api.airtable.com",
	apiKey: process.env.GOOD_INTERNET_AIRTABLE_API_KEY
});
var base = Airtable.base(process.env.GOOD_INTERNET_BASE_ID);

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
				upvotes: ".story-vote-count"
			}]
		).then(function (res) {
			return res.map(website => {
				return {
					title: website.url,
					url: website.url,
					upvotes: parseInt(website.upvotes)
				};
			});
		});

		return Promise.resolve(websites);
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
	async uploadToImgur(image) {
		console.log("Uploading images to Imgur");

		imgur.setCredentials(
			process.env.IMGUR_USER,
			process.env.IMGUR_PASSWORD,
			process.env.IMGUR_CLIENTID
		);

		let json = await imgur.uploadFile(image,process.env.GOOD_INTERNET_IMGUR_ALBUM_ID);
		return Promise.resolve(json.data.link);
	}
	async addToAirtable(website) {
		console.log("Uploading files");
		console.log(website);

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
