#!/usr/bin/env node

'use strict';

var Xray = require('x-ray');
var x = Xray();
var Metascraper = require('metascraper');
var async = require('async');
var Pageres = require('pageres');

const screenshotSizes = ['1440x1024', 'iphone 5s'];
const filenameFormat = '<%= url %>';

var goodWebsite = {};

function topWebsite(allWebsites, callback) {
	var topWebsite;

	allWebsites.forEach(function (website) {
		if (!topWebsite) {
			topWebsite = website;
		} else if (parseInt(topWebsite.upvotes) < parseInt(website.upvotes)) {
			topWebsite = website;
		}
	});
	callback(null, topWebsite);
}

function scrapeDesignerNews(callback) {
	x('https://www.designernews.co/badges/design', '.story-list-item', [{
		url: '.montana-item-title@href',
		upvotes: '.upvoted-number',
	}])(function (err, allWebsites) {
		callback(null, allWebsites);
	});
}

function getMeta(topWebsite, callback) {
	Metascraper
		.scrapeUrl(topWebsite.url)
		.then((metadata) => {
			topWebsite.title = metadata.title;
			callback(null, topWebsite);
		});
}

function screenshot(topWebsite, callback) {
	console.log(`Taking screenshots of ${topWebsite.url}`);

	const pageres = new Pageres({
			delay: 0
		})
		.src(topWebsite.url, screenshotSizes, {
			crop: false
		})
		.dest(process.cwd())
		.run()
		.then(() => {
			console.log('done');

			var screenshots = streams.map(function (stream) {
				return stream.filename
			});

			topWebsite.screenshots = screenshots;

			callback(null, topWebsite);
		});
}

function upload(topWebsite, callback) {
	console.log("Uploading files");

	async.parallel([
		function (callback) {
			client.uploadImage(screenshots[0]).then((uploadRequestDesktop) => {
				callback(null, uploadRequestDesktop);
			});
		},
		function (uploadRequestDesktop, callback) {
			client.uploadImage(screenshots[1]).then((uploadRequestMobile) => {
				callback(null, uploadRequestDesktop, uploadRequestMobile);
			});
		}
	], function (err, results) {
		console.log(results);

		// client.items.create({
		// 	itemType: '10825',
		// 	name: topWebsite.title,
		// 	url: topWebsite.url,
		// 	description: description,
		// 	desktop_screenshot: uploadRequestDesktop,
		// 	mobile_screenshot: uploadRequestMobile
		// }).then((record) => {
		// 	callback(null, topWebsite);
		// });
	});

}

function deleteLocalFiles(paths, callback) {
	paths.forEach(function (path) {
		fs.unlink(path, (err) => {
			if (err) {
				console.error("Failed to delete local file: " + error);
			} else {
				console.log("Deleted local: " + path);
			}
		})
	})
}

async.waterfall([
	scrapeDesignerNews,
	topWebsite,
	getMeta,
	screenshot,
	upload,
	deleteLocalFiles
], function (err, results) {
	if (err) {
		console.log(`Something went wrong: ${err}`);
	}

	console.log(results);
});
