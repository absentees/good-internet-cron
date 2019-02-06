#!/usr/bin/env node
import goodLib from "./good-lib";
import CronJob from "cron";

// module.exports = async function (req, res) {
module.exports = async (req, res) => {
	// try {
		let cron = new CronJob('0 * * * * *', async function() {
			console.log("Job is checking for good internet daily.");
			//var cronJob = new CronJob('0 0 */12 * * *', function() { //  Production once a day cron job
			// let websites = await goodLib.scrapeDesignerNews();
			// let topWebsite = await goodLib.sortWebsites(websites);
			// topWebsite = await goodLib.getMeta(topWebsite);
			// topWebsite = await goodLib.screenshot(topWebsite);
			// topWebsite = await goodLib.uploadToImgur(topWebsite);
			// topWebsite = await goodLib.addToAirtable(topWebsite);
			// await goodLib.deleteLocalFiles(topWebsite);
			// await goodLib.publishSite();
		}, null, false, 'Australia/Sydney');
	
		cron.start();
		console.log("Job is: " + cron.running + " – checking for good internet daily.");
	// } catch (error) {
	// 	console.error(error);
	// }
}


