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
	/**
	 *
	 *
	 * @param {Array} Array 
	 * @returns
	 * @memberof GoodLib
	 */
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
	/**
	 *
	 *
	 * @returns
	 * @memberof GoodLib
	 */
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
	/**
	 * Takes a desktop and mobile screenshot at a given path of a given url, returns an array
	 * 
	 * @param {*} url
	 * @param {*} filePath
	 * @returns
	 * @memberof GoodLib
	 */
	async screenshotURL(url, filePath) {
		console.log(`Taking screenshots of ${url}`);

		const browser = await puppeteer.launch({
			args: chrome.args,
			executablePath: await chrome.executablePath,
			headless: chrome.headless,
		});
		
		const page = await browser.newPage();

		await page.goto(url, {
			waitUntil: "networkidle0"
		});
		await page.setViewport({
			width: 1280,
			height: 800
		});
		await page.screenshot({
			path: `${filePath}/desktop`,
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
			path: `${filePath}/mobile`,
			fullPage: true,
			type: "jpeg"
		});
		await browser.close();

		return Promise.resolve();
	}
	/**
	 *
	 *
	 * @param {*} image
	 * @returns
	 * @memberof GoodLib
	 */
	async uploadToImgur(image) {
		console.log(`Uploading images to Imgur: ${image}`);

		imgur.setCredentials(
			process.env.IMGUR_USER,
			process.env.IMGUR_PASSWORD,
			process.env.IMGUR_CLIENTID
		);

		let json = await imgur.uploadFile(image,process.env.GOOD_INTERNET_IMGUR_ALBUM_ID);
		return Promise.resolve(json.data.link);
	}

	async addToAirtable(title, url, desktopImageLink, mobileImageLink) {
		console.log("Uploading files");
		console.log(url);

		let record = await base("Good").create({
			Name: title,
			URL: url,
			"Desktop Screenshot": [{
				url: desktopImageLink
			}],
			"Mobile Screenshot": [{
				url: mobileImageLink
			}]
		});

		return Promise.resolve(record);
	}
	/**
	 *
	 *
	 * @param {*} website
	 * @returns
	 * @memberof GoodLib
	 */
	async deleteFile(filePath) {

		fs.unlink(filePath, err => {
			if (err) {
				console.error("Failed to delete local file: " + error);
			} else {
				console.log("Deleted local: " + filePath);
			}
		});

		return Promise.resolve();
	}
	/**
	 *
	 *
	 * @param {*} website
	 * @returns
	 * @memberof GoodLib
	 */
	async publishSite(website){
		console.log("Publishing site.");
		let response = await axios.post(process.env.NETLIFY_DEPLOY_HOOK);
		return Promise.resolve(response);
	}
	getUrlFromPath(str) {
		let url = str.slice(1);
		if (!url.startsWith('http')) {
			return 'https://' + url;
		}
		return url;
	}
};
