const fetch = require('node-fetch');
const readXlsx = require('read-excel-file/node');
const { writeFileSync, open } = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { studentSchema, mentorSchema } = require('./schema');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

const indexResetOffset = 0;
const fileredDate = [
"8//2023",				
"8//2023",				
]

dotenv.config();

const dateObj = (...args) => new Date(...args);

const studentOutputFileName = `students-output_${dateObj().getDate()}-${dateObj().getMonth()}-${dateObj().getFullYear()}.csv`;
const mentorOutputFileName = `mentors-output_${dateObj().getDate()}-${dateObj().getMonth()}-${dateObj().getFullYear()}.csv`;

const studentOutputFile = path.join(__dirname, studentOutputFileName);
const mentorOutputFile = path.join(__dirname, mentorOutputFileName);

const token = process.env.TOKEN;
const BACKEND_URL = process.env.BACKEND_URL;

const batches = {
	"fullstackwithpythonprogramming": "64d36ab4ca58e400768b6887",
	"chatgpt": "64d36a7aeca69f00773c53f9",
	"devops": "64d36a93d2077700769bb524",
};

const programs = {
	"64d36a7aeca69f00773c53f9": "27",
	"64d36a93d2077700769bb524": "28",
	"64d36ab4ca58e400768b6887": "29"
};

const courseIds = {
	"fullstackwithpythonprogramming": "pythonfullstack",
	"chatgpt": "chatgptpro",
	"devops": "advanceddevops",
};

(async () => {
	try {

		open(argv?.mentor ? mentorOutputFileName : studentOutputFileName, 'r', (err, res) => {

			if (!res) {
				let outputData
				if (argv?.mentor) {
					outputData = 'name, email, mobile, role, message\n';
				} else {
					outputData = 'name, email, mobile, batch, message, courseActivated\n';
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

		let data = await readXlsx(argv?.mentor ? 'mentors.xlsx' : 'students.xlsx', { schema: argv?.mentor ? mentorSchema : studentSchema });
		console.log(`Total: ${data.rows.length}`)
		if(fileredDate.length){
			data.rows = data?.rows?.filter((time) => {
				const date = time?.time.split(' ')[0]
				return fileredDate.includes(date)
			})
		}
		console.log(`Filtered: ${data.rows.length}\n`)

		let rolesData = {}
		if(argv?.console){
			console.log(JSON.stringify(data.rows?.map(k => k?.email)))
		} else {
			if (argv?.mentor) {
				const batchResponse = await fetch(`${BACKEND_URL}/manageValues/get-user-roles`, {
					method: 'GET',
					headers: { 'Content-Type': 'application/json', authorization: `bearer ${token}` },
				});
				rolesData = await batchResponse.json();
			}
	
			for (let index = indexResetOffset; index < data?.rows?.length; index += 1) {
				const element = data?.rows[index];
	
				const name = element?.name;
				const email = element?.email;
				const batchName = element?.batch.toLowerCase().replace(/\s/g,'')
				const batch = batches[batchName];
				const mobile = element?.mobile || "";
				const role = element?.role;
				const primaryEmail = element?.primaryEmail;
				const secondaryEmail = element?.secondaryEmail;
				const program = programs[batch] || 0;
				const courseId = courseIds[batchName];


				const url = argv?.mentor ? `${BACKEND_URL}/users/create` : `${BACKEND_URL}/users/student/create`
	
				if (!argv?.dry) {
					setTimeout(async () => {
						const response = await fetch(url, {
							method: 'POST',
							body: argv?.mentor ? JSON.stringify({ name, email: secondaryEmail || primaryEmail, mobile, role }) : JSON.stringify({...element, batch, program, mobile}),
							headers: { 'Content-Type': 'application/json', authorization: `bearer ${token}` },
						});
	

						let guviResponse 
						if(!argv?.mentor){
							const resp = await fetch(process.env.GUVI_ENDPOINT, {
								method: 'POST',
								body: JSON.stringify({
									"apiKey": process.env.GUVI_API_KEY,
									"clientId": process.env.GUVI_CLIENT_ID,
									"userName": name,
									"mobileNumber": mobile,
									"userEmail": email,
									"courseId": courseId
								}),
							});
							guviResponse = await resp.json()
						}
	
						const res = await response.json();
	
						let outputData
						if (!argv?.mentor) {
							outputData = `${name}, ${email}, ${mobile}, ${element?.batch}, ${res?.message}, ${guviResponse?.status}\n`;
							console.log(index + 1, res?.message, ' ---> ', guviResponse?.status, element?.batch, email);
						} else {
							const { name: roleName } = rolesData?.roles?.find((key) => key?._id === role);
							outputData = `${name}, ${secondaryEmail || primaryEmail}, ${mobile}, ${roleName}, ${res?.message}\n`;
							console.log(index + 1, res?.message, ' ---> ', roleName, secondaryEmail || primaryEmail);
						}
	
						writeFileSync(argv?.mentor ? mentorOutputFile : studentOutputFile, outputData, { flag: 'a' });
	
					}, 500 * (index - indexResetOffset))
				} else {
					if (!argv?.mentor) {
						console.log(index + 1, element?.batch, program, courseId,  ' ---> ', email);
					} else {
						const { name: roleName } = rolesData?.roles?.find((key) => key?._id === role);
						console.log(index + 1, roleName, ' ---> ', secondaryEmail || primaryEmail);
					}
				}
			}
		}
	} catch (error) {
		console.log(error);
	}
})();
