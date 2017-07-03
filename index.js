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
		// .src(topWebsite.url, screenshotSizes, {
		.src('http://google.com', screenshotSizes, {
			crop: false
		})
		.dest(process.cwd())
		.run()
		.then((streams) => {
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

	client.uploadImage(topWebsite.screenshots[0]).then((uploadRequestDesktop) => {

		console.log("Uploaded desktop image");
		console.log(uploadRequestDesktop);
		callback(null, topWebsite);
	}).catch((err) => {
		console.log(err);
		callback(err, topWebsite);
	});

	// async.waterfall([
	// 	function (callback) {
	// 		console.log(`Uploading image: ${topWebsite.screenshots[0]}`);
	// 		client.uploadImage(topWebsite.screenshots[0]).then((uploadRequestDesktop) => {
	// 			console.log("Uploaded desktop image");
	// 			console.log(uploadRequestDesktop);
	// 			callback(null, topWebsite);
	// 		});
	// 	},
	// 	function (uploadRequestDesktop, callback) {
	// 		client.uploadImage(topWebsite.screenshots[1]).then((uploadRequestMobile) => {
	// 			console.log("Uploaded mobile image");
	// 			console.log(uploadRequestMobile);
	// 			callback(null, uploadRequestDesktop, uploadRequestMobile);
	// 		});
	// 	}
	// ], function (err, uploadRequests) {
	// 	if (err) {
	// 		callback(err, uploadRequests);
	// 	}
	//
	// 	callback(null, topWebsite);
	//
	// 	// client.items.create({
	// 	// 	itemType: '10825',
	// 	// 	name: topWebsite.title,
	// 	// 	url: topWebsite.url,
	// 	// 	description: description,
	// 	// 	desktop_screenshot: uploadRequests[0],
	// 	// 	mobile_screenshot: uploadRequests[1]
	// 	// }).then((record) => {
	// 	// 	callback(null, record);
	// 	// });
	// });
}

function deleteLocalFiles(topWebsite, callback) {
	topWebsite.screenshots.forEach(function (path) {
		fs.unlink(path, (err) => {
			if (err) {
				console.error("Failed to delete local file: " + error);
			} else {
				console.log("Deleted local: " + path);
			}
		})
	})

	callback(null, topWebsite);
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
