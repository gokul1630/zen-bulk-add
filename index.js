const fetch = require('node-fetch');
const readXlsx = require('read-excel-file/node');
const { writeFileSync, open } = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const schema = require('./schema');

dotenv.config();

const dateObj = (...args) => new Date(...args);

const outputFileName = `output_${dateObj().getDate()}-${dateObj().getMonth()}-${dateObj().getFullYear()}.csv`;

const outputFile = path.join(__dirname, outputFileName);

const token = process.env.TOKEN;
const BACKEND_URL = process.env.BACKEND_URL;

const indexResetOffset = 0;

(async () => {
	try {
		
	open(outputFileName, 'r', (err, res) => {

		if (!res) {
			const outputData = 'name, email, mobile, batch, message\n';
			writeFileSync(outputFile, outputData, { flag: 'a' });
			return;
		}
		writeFileSync(outputFile, '\n', { flag: 'a' });
	});

    const data = await readXlsx('students.xlsx', { schema });
    const batchResponse = await fetch(`${BACKEND_URL}/batch/all-names`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', authorization: `bearer ${token}` },
    });

    const batchData = await batchResponse.json();

    for (let index = indexResetOffset; index < data?.rows.length; index += 1) {
        const element = data?.rows[index];

        const { name, email, mobile, batch } = element;

        const batchName = batchData?.batches?.find((key) => key?._id === batch)?.name;

        setTimeout(async () => {
            const response = await fetch(`${BACKEND_URL}/users/student/create`, {
                method: 'POST',
                body: JSON.stringify(element),
                headers: { 'Content-Type': 'application/json', authorization: `bearer ${token}` },
            });

            const res = await response.json();

            const outputData = `${name}, ${email}, ${mobile}, ${batchName}, ${res?.message}\n`;

            writeFileSync(outputFile, outputData, { flag: 'a' });

            console.log(index + 1, res?.message, ' ---> ', batchName, email);
        }, 1000 * (index - indexResetOffset));
    }
	} catch (error) {
		console.log(error);
	}
})();
