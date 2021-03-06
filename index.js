#!/usr/bin/env node

require('dotenv').config();
require('babel-polyfill');
var Xray = require('x-ray');
var x = Xray();
var Metascraper = require('metascraper');
var async = require('async');
var Pageres = require('pageres');
const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');
var CronJob = require('cron').CronJob;
const imgur = require('imgur');

const Airtable = require('airtable');
Airtable.configure({
	endpointUrl: 'https://api.airtable.com',
	apiKey: process.env.GOOD_INTERNET_AIRTABLE_API_KEY
});
var base = Airtable.base(process.env.GOOD_INTERNET_BASE_ID);

const screenshotSizes = ['1440x1024', 'iphone 5s'];
const filenameFormat = '<%= url %>';

function sortWebsites(allWebsites, callback) {

	allWebsites.sort((a, b) => {
		return b.upvotes - a.upvotes;
	});

	// Only move on with the top website
	callback(null, allWebsites[0]);
}

function scrapeDesignerNews(callback) {
	x('https://www.designernews.co/badges/design', '.story-list-item', [{
		url: '.montana-item-title@href',
		upvotes: '.upvoted-number'
	}])(function (err, allWebsites) {
		if(err) {
			console.error(err);
		}

		allWebsites.map((website) => {
			return {
				url: website.url,
				upvotes: parseInt(website.upvotes)
			}
		});

		callback(null, allWebsites);
	});
}

function getMeta(website, callback) {
	Metascraper
		.scrapeUrl(website.url)
		.then((metadata) => {
			website.title = metadata.title;
			return website;
		});

	callback(null, website);
}

function screenshot(website, callback) {
	console.log(`Taking screenshots of ${website.url}`);

	const pageres = new Pageres({
			delay: 10
		})
		.src(website.url, screenshotSizes, {
			crop: true,
			format: "jpg"
		})
		.dest(os.tmpdir())
		.run()
		.then((streams) => {

			var screenshots = streams.map(function (stream) {
				return stream.filename
			});

			website.screenshots = screenshots;

			callback(null, website);
		}).catch((err) => {
			callback(err);
		});
}

function uploadToImgur(website, callback){
	console.log("Uploading images to Imgur");

	imgur.setCredentials(process.env.IMGUR_USER, process.env.IMGUR_PASSWORD, process.env.IMGUR_CLIENTID);

	console.log(website.screenshots);

	// Upload images to imgur good internet folder
	imgur.uploadImages(website.screenshots, 'File', process.env.GOOD_INTERNET_IMGUR_ALBUM_ID)
	.then(function(images){
		website.screenshotURLs = images.map(function(image){
			console.log("Imgur image link: " + image.link);
			return image.link;
		})
		callback(null, website);
	})
	.catch(function(err){
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
	website.screenshots.forEach(function (path) {
		fs.unlink(path, (err) => {
			if (err) {
				console.error("Failed to delete local file: " + error);
			} else {
				console.log("Deleted local: " + path);
			}
		})
	})

	callback(null, website);
}

function publishSite(website, callback) {
	console.log("Publishing site.");

	axios.post(process.env.NETLIFY_DEPLOY_HOOK).then((res) => {
		callback(null, "Published.");
	}).catch((err) => {
		callback(err);
	});
}


var cronJob = new CronJob('0 * * * * *', function() {
//var cronJob = new CronJob('0 0 */12 * * *', function() { 

	// Check sites once a day
	async.waterfall([
		scrapeDesignerNews,
		sortWebsites,
		getMeta,
		screenshot,
		uploadToImgur,
		addToAirtable,
		deleteLocalFiles,
		publishSite
	], function (err, results) {
		if (err) {
			console.log(`Something went wrong: ${err}`);
		}
		console.log(results);
	});
}, null, false, 'Australia/Sydney');

cronJob.start();
console.log("Job is: " + cronJob.running + " – checking for good internet daily.");

module.exports = (req, res) => {
  res.end('Good Internet cron is: ' + cronJob.running)
}