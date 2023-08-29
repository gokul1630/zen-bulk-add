const studentSchema = {
	'Student Name': {
		prop: 'name',
		type: String,
	},
	'Student Contact Mobile:': {
		prop: 'mobile',
		type: String,
	},
	'Course Selected': {
		prop: 'batch',
		type: String,
	},
	'Email Address': {
		prop: 'email',
		type: String,
	},
	'Timestamp': {
		prop: 'time',
		type: String,
	}
};


const mentorSchema = {
	'Mail': {
		prop: 'primaryEmail',
		type: String
	},
	'alternativer Email ID': {
		prop: 'secondaryEmail',
		type: String
	},
	'Name': {
		prop: 'name',
		type: String
	},
	'contact': {
		prop: 'mobile',
		type: String
	},
	'Role': {
		prop: 'role',
		type: String
	},

}
module.exports = {
	studentSchema,
	mentorSchema
}
