const fetch = require("node-fetch");
const xlsx = require("node-xlsx");
const { readFileSync, writeFileSync, open } = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config()

const dateObj = (...args) => new Date(...args);

const outputFileName = `output_${dateObj().getDate()}-${dateObj().getMonth()}-${dateObj().getFullYear()}.csv`;

open(outputFileName, 'r', (err, res) => {
	if (!res) {
		const outputData = 'name, email, mobile, batch, message\n'
		writeFileSync(outputFile, outputData, { flag: 'a' });
		return;
	}
	writeFileSync(outputFile, '\n', { flag: 'a' })
})

const outputFile = path.join(__dirname, outputFileName)

const data = xlsx.parse(readFileSync(__dirname + '/students.xlsx'))[0];

const token = process.env.TOKEN;
const BACKEND_URL = process.env.BACKEND_URL

/** default value should be 1 */
const indexResetOffset = 1;

(async () => {
	const batchResponse = await fetch(`${BACKEND_URL}/batch/all-names`, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json', authorization: `bearer ${token}`, }
	});

	const batchData = await batchResponse.json()

	for (let index = indexResetOffset; index < data.data.length; index += 1) {
		const element = data.data[index];

		if (element.length && token && BACKEND_URL) {
			const name = element[4]
			const email = element[1]
			const mobile = `${element[5]}`
			const batch = element[3]
			const batchName = batchData.batches?.find(key => key?._id === batch)?.name

			setTimeout(async () => {
				const response = await fetch(`${BACKEND_URL}/users/student/create`, {
					method: 'POST',
					body: JSON.stringify({
						name, email, batch, mobile
					}),
					headers: { 'Content-Type': 'application/json', authorization: `bearer ${token}`, }

				});
				const res = await response.json();
				const outputData = `${name}, ${email}, ${mobile}, ${batchName}, ${res?.message}\n`
				writeFileSync(outputFile, outputData, { flag: 'a' })
				console.log(index, res?.message, ' ---> ', batchName, email);
			}, 1000 * (index - indexResetOffset + 1));
		}
	}
})()