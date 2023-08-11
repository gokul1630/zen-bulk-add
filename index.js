const fetch = require('node-fetch');
const readXlsx = require('read-excel-file/node');
const { writeFileSync, open } = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { studentSchema, mentorSchema } = require('./schema');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

dotenv.config();

const dateObj = (...args) => new Date(...args);

const studentOutputFileName = `students-output_${dateObj().getDate()}-${dateObj().getMonth()}-${dateObj().getFullYear()}.csv`;
const mentorOutputFileName = `mentors-output_${dateObj().getDate()}-${dateObj().getMonth()}-${dateObj().getFullYear()}.csv`;

const studentOutputFile = path.join(__dirname, studentOutputFileName);
const mentorOutputFile = path.join(__dirname, mentorOutputFileName);

const token = process.env.TOKEN;
const BACKEND_URL = process.env.BACKEND_URL;

const indexResetOffset = 0;
const programs = {
	"64d36a7aeca69f00773c53f9": "27",
	"64d36a93d2077700769bb524": "28",
	"64d36ab4ca58e400768b6887": "29"
};

(async () => {
	try {

		open(argv?.mentor ? mentorOutputFileName : studentOutputFileName, 'r', (err, res) => {

			if (!res) {
				let outputData
				if (argv?.mentor) {
					outputData = 'name, email, mobile, role, message\n';
				} else {
					outputData = 'name, email, mobile, batch, message\n';
				}
				if (!argv?.dry) {
					writeFileSync(argv?.mentor ? mentorOutputFile : studentOutputFile, outputData, { flag: 'a' });
				}
				return;
			}
			if (!argv?.dry) {
				writeFileSync(argv?.mentor ? mentorOutputFile : studentOutputFile, '\n', { flag: 'a' });
			}
		});

		const data = await readXlsx(argv?.mentor ? 'mentors.xlsx' : 'students.xlsx', { schema: argv?.mentor ? mentorSchema : studentSchema });

		let batchData = {};
		let rolesData = {}
		if (argv?.mentor) {
			const batchResponse = await fetch(`${BACKEND_URL}/manageValues/get-user-roles`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json', authorization: `bearer ${token}` },
			});
			rolesData = await batchResponse.json();

		} else {
			const batchResponse = await fetch(`${BACKEND_URL}/batch/all-names`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json', authorization: `bearer ${token}` },
			});

			batchData = await batchResponse.json();
		}

		for (let index = indexResetOffset; index < data?.rows.length; index += 1) {
			const element = data?.rows[index];

			const name = element?.name;
			const email = element?.email;
			const batch = element?.batch;
			const mobile = element?.mobile;
			const role = element?.role;
			const primaryEmail = element?.primaryEmail;
			const secondaryEmail = element?.secondaryEmail;
			const program = programs[batch] || 0;


			const url = argv?.mentor ? `${BACKEND_URL}/users/create` : `${BACKEND_URL}/users/student/create`

			if (!argv?.dry) {
				setTimeout(async () => {
					const response = await fetch(url, {
						method: 'POST',
						body: argv?.mentor ? JSON.stringify({ name, email: secondaryEmail || primaryEmail, mobile, role }) : JSON.stringify({...element, program}),
						headers: { 'Content-Type': 'application/json', authorization: `bearer ${token}` },
					});

					const res = await response.json();

					let outputData
					if (!argv?.mentor) {
						const { name: batchName } = batchData?.batches?.find((key) => key?._id === batch);
						outputData = `${name}, ${email}, ${mobile}, ${batchName}, ${res?.message}\n`;
						console.log(index + 1, res?.message, ' ---> ', batchName, email);
					} else {
						const { name: roleName } = rolesData?.roles?.find((key) => key?._id === role);
						outputData = `${name}, ${secondaryEmail || primaryEmail}, ${mobile}, ${roleName}, ${res?.message}\n`;
						console.log(index + 1, res?.message, ' ---> ', roleName, secondaryEmail || primaryEmail);
					}

					writeFileSync(argv?.mentor ? mentorOutputFile : studentOutputFile, outputData, { flag: 'a' });

				}, 1000 * (index - indexResetOffset))
			} else {
				if (!argv?.mentor) {
					const { name: batchName } = batchData?.batches?.find((key) => key?._id === batch);
					console.log(index + 1, batchName, program, ' ---> ', email);
				} else {
					const { name: roleName } = rolesData?.roles?.find((key) => key?._id === role);
					console.log(index + 1, roleName, ' ---> ', secondaryEmail || primaryEmail);
				}
			}
		}
	} catch (error) {
		console.log(error);
	}
})();
