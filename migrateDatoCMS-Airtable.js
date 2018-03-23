#!/usr/bin/env node

require("dotenv").config();
require("babel-polyfill");
var Xray = require("x-ray");
var x = Xray();
var Metascraper = require("metascraper");
var async = require("async");
var Pageres = require("pageres");
const fs = require("fs");
const SiteClient = require("datocms-client").SiteClient;
const client = new SiteClient(process.env.DATOCMS_READ_WRITE);
const axios = require("axios");
const Airtable = require('airtable');
Airtable.configure({
	endpointUrl: 'https://api.airtable.com',
	apiKey: process.env.GOOD_INTERNET_AIRTABLE_API_KEY
});
var base = Airtable.base(process.env.GOOD_INTERNET_BASE_ID);

function getDatoCMSRecords(callback){
	var allRecords;
	
	client.items.all({ itemType: '10825' })
	.then((records) => {
		allRecords = records;
		callback(null, allRecords);
	});
}

function createAirtableRecords(records, callback) {
	console.log("Creating Airtable records");

	async.each(records, function (record, callback) {
		base("Good").create(
			{
				Name: record.name,
				URL: record.url,
				Description: record.description,
				"Desktop Screenshot": [
					{
						url:
							"https://www.datocms-assets.com" + record.desktopScreenshot.path
					}
				],
				"Mobile Screenshot": [
					{
						url:
						"https://www.datocms-assets.com" + record.mobileScreenshot.path
					}
				]
			},
			function(err, record) {
				if (err) {
					console.log(`Something went wrong creating record: ${err}`);
				}
				callback();
			}
		);
	},function(err){
		if (err) {
			console.log(err);
		}

		callback(null);
	});
}

async.waterfall([
	getDatoCMSRecords,
	createAirtableRecords
], function(err, records) {
	if (err) {
		console.log(`Something went wrong: ${err}`);
	}

	console.log("Done.");
});
