#!/usr/bin/env node

require('dotenv').config();
require('babel-polyfill');
var Xray = require('x-ray');
var x = Xray();
var Metascraper = require('metascraper');
var async = require('async');
var Pageres = require('pageres');
const fs = require('fs');
const SiteClient = require('datocms-client').SiteClient;
const client = new SiteClient(process.env.DATOCMS_READ_WRITE);
const axios = require('axios');
var CronJob = require('cron').CronJob;


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
		upvotes: '.upvoted-number',
	}])(function (err, allWebsites) {
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
		.dest(process.cwd())
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

function upload(website, callback) {
	console.log("Uploading files");

	base("Good").create(
		{
			Name: website.name,
			URL: website.url,
			Description: website.description,
			"Desktop Screenshot": [
				{
					url:
						"https://www.datocms-assets.com" + website.desktopScreenshot.path
				}
			],
			"Mobile Screenshot": [
				{
					url:
					"https://www.datocms-assets.com" + website.mobileScreenshot.path
				}
			]
		},
		function(err, website) {
			if (err) {
				console.log(`Something went wrong creating website: ${err}`);
			}
			callback();
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
	// Check sites once a day
	async.waterfall([
		scrapeDesignerNews,
		sortWebsites,
		getMeta,
		screenshot,
		upload,
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