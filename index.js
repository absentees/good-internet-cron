#!/usr/bin/env node
import goodLib from "./good-lib";

(async () => {
	// var cronJob = new CronJob('0 * * * * *', async function() {
	//var cronJob = new CronJob('0 0 */12 * * *', function() {
	let websites = await goodLib.scrapeDesignerNews();
	let topWebsite = await goodLib.sortWebsites(websites);
	topWebsite = await goodLib.getMeta(topWebsite);
	topWebsite = await goodLib.screenshot(topWebsite);
	// topWebsite = await goodLib.uploadToImgur(topWebsite);
	// topWebsite = await goodLib.addToAirtable(topWebsite);
	await goodLib.deleteLocalFiles(topWebsite);
	// await goodLib.publishSite();
	// }, null, false, 'Australia/Sydney');

	// cronJob.start();
	// console.log("Job is: " + cronJob.running + " – checking for good internet daily.");

	// module.exports = (req, res) => {
	// 	res.end("Good Internet cron is: " + cronJob.running);
	// };
})();
