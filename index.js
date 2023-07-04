const inquirer = require("inquirer");
const mysql = require("mysql2");
// connect to the mysql database
const db = mysql.createConnection(
	{
		host: "localhost",
		user: "root",
		password: "freecreditreport.com",
		database: "business_db",
	},
	console.log(`Connected to the business_db database.`)
);
// a global array to store our database primitevly
var dbprim = [];
// update the global primitive representation of the database with nescessary data.
async function updatePrim() {
	const deps = await db.promise().query(`SELECT name, id FROM department`);
	const roles = await db
		.promise()
		.query(`SELECT title, id, department_id FROM role`);
	dbprim = deps[0];
	dbprim.forEach((dep) => {
		dep["roles"] = [];
		roles[0].forEach((role) => {
			if (role["department_id"] === dep["id"]) {
				dep["roles"].push(role);
			}
		});
	});
	return dbprim;
}
/**
 * @deprecated You are better off using another package or using node's
 * standard console.table() method and will be phased out of the employee tracker all together. The decleration is still here because I
 * spent too long on this.
 * @description Uses console.log() to render an array of objects in a simpler table format than console.table(). Also ignores stdstream and indeces.
 * This function is rudementary and not optimized for streams (or at all).
 * @param {Object[]} arr An array of objects.
 * @param {Number} _padding A number indicating how much white space there should be between columns (1) (optional)
 * @param {String} _hsep A string seperator to use instead of dashes ('-') (optional).
 * @param {String} _hhsep A string seperator to use instead of equal signs, which is only used below the table definitions ('=') (optional).
 * @param {String} _vsep A string seperator to use instead of pipes ('|') (optional).
 * @param {String} _ws A string to fill the whitespace in the table instead of space ('\s') (optional)
 */
function renderTables(
	arr,
	_padding = 2,
	_hsep = "-",
	_hhsep = "=",
	_vsep = "|",
	_ws = " "
) {
	console.clear();
	// a local function which will return a string of repeated characters. The length of the string and the characters in question are passed in.
	let charLen = (char, len) => {
		// all contexts of this function will require the padding.
		len += _padding;
		// will hold our string
		let ret = "";
		// append the character as many times as requested.
		for (let i = 0; i < len; i++) {
			ret = ret.concat(char);
		}
		return ret;
	};
	// ensure the array passed is an array
	if (!Array.isArray(arr))
		throw new Error(
			`renderTables expected paramter 'arr' to be an array, recieved ${typeof arr}`
		);
	// holds longest length entries for each key
	let buffers = {};
	// initialize the buffers object with the keys and a starting value of 0.
	// NOTE: this will cause a memory leak as Object.keys() is a prototype
	Object.keys(arr[0]).forEach((key) => (buffers[key] = 0));
	// loop through each object in the array
	arr.forEach((obj) => {
		// check the type of each object
		if (!(typeof obj === "object"))
			throw new Error(
				`renderTables expected parameter 'arr' to be an array of objects, recieved ${JSON.stringify(
					arr
				)}`
			);
		// loop through the keys of this object
		Object.keys(obj).forEach((key) => {
			// check falsy, which in our case is either a 0 or null. sql will not return undefined
			if (!obj[key]) obj[key] = "none";
			// check that the type of each entry is a string, if not convert it to string
			if (typeof obj[key] !== "string") obj[key] = String(obj[key]);
			// if buffers is not defined as some key, make it 0. this should be caught by the initiliazaiton above, but evil js pointers
			// means this will not work without this second backup
			if (!buffers[key]) buffers[key] = 0;
			// if the length of this key's entry is longer than the buffer for that key, set the buffer to this length
			if (obj[key].length > buffers[key]) buffers[key] = obj[key].length;
			// doubly check if the key itself is longer. This could be the initliaztion by looping through any one object once, which we do below
			// but again, evil js pointers means every nested Object.keys() could result in memory leaks
			if (key.length > buffers[key]) buffers[key] = key.length;
		});
	});
	// will hold the total length of the table
	let totalLen = 0;
	// add each buffer to the length b/c the buffers are the length of each column
	Object.keys(buffers).forEach((key) => {
		totalLen += buffers[key];
	});
	// will hold the title of the table (i.e. the keys)
	let tableTitle = "";
	// concat each key to the title followed by remaining buffer and padding with white space
	Object.keys(arr[0]).forEach((key) => {
		tableTitle = tableTitle
			.concat(key)
			.concat(charLen(_ws, buffers[key] - key.length));
	});
	// log out the title
	console.log(tableTitle);
	// log out a divider. never long enough? issue with code? will blame evil js pointers instead.
	console.log(charLen(_hhsep, totalLen));
	// loop through each object
	arr.forEach((obj) => {
		// will hold the row
		let line = "";
		// loop through each key of the object
		Object.keys(obj).forEach((key) => {
			// append the entry and any buffer and padding remaining
			line = line.concat(
				obj[key].concat(charLen(_ws, buffers[key] - obj[key].length))
			);
		});
		// log out this row.
		console.log(line);
	});
	return 1;
}
/**
 * Asynchronouly view all department with a call to the now deprecated renderTables()
 * @param {Number} hcb An integer used to call back to the home function.
 */
async function viewAllDepartments(hcb) {
	// get all the departments
	const r = await db.promise().query(`SELECT * FROM department`);
	// render the tables with the query response
	renderTables(r[0]);
	// call back to home
	home(hcb);
}
/**
 * Asynchronously view all roles and their departments with a call to the now deprecated renderTables().
 * @param {Number} hcb A integer used to call back to the home function
 */
async function viewAllRoles(hcb) {
	// initialize an array for the formatted data
	let formatted = [];
	// get all roles
	const r = await db.promise().query(`SELECT * FROM role`);
	// for each role
	r[0].forEach(async (role) => {
		// get the department of that role using department ID
		const r1 = await db
			.promise()
			.query(
				`SELECT name FROM department WHERE id="${role["department_id"]}"`
			);
		// set the department key to the name of the department
		role["department"] = r1[0][0]["name"];
		// delete the department id key
		delete role["department_id"];
		// add the now formatted role to the array
		formatted.push(role);
		// once we reach the end, render the formatted table and return home.
		if (formatted.length === r[0].length) {
			// memory leaks out the wazoo
			renderTables(formatted);
			home(hcb);
		}
	});
}
/**
 * Asynchronously view all employees and their roles, departments, salaries, and managers
 * @param {Number} hcb An integer used to call back to the home function
 */
async function viewAllEmployees(hcb) {
	// initialize an array for the formatted data
	let formatted = [];
	// get all employees.
	let ret1 = await db.promise().query(`SELECT * FROM employee`);
	// for each employee
	await ret1[0].forEach(async (employee) => {
		// get the title, department id, and salary from the role id
		let roleres = await db
			.promise()
			.query(
				`SELECT title, department_id, salary FROM role WHERE id="${employee["role_id"]}"`
			);
		// add the data to the employee
		employee["title"] = roleres[0][0]["title"];
		employee["salary"] = roleres[0][0]["salary"];
		// get the department using department id
		let depres = await db
			.promise()
			.query(
				`SELECT name FROM department WHERE id="${roleres[0][0]["department_id"]}"`
			);
		// add the data to the employee
		employee["department"] = depres[0][0]["name"];
		// get the manager via manager id
		let manres = await db
			.promise()
			.query(
				`SELECT first_name,last_name FROM employee WHERE id="${employee["manager_id"]}"`
			);
		// add the data if it exists, otherwise make it null.
		employee["manager"] = manres[0][0]
			? `${manres[0][0]["first_name"]} ${manres[0][0]["last_name"]}`
			: null;

		// remove the ids
		delete employee["role_id"];
		delete employee["manager_id"];
		// add the now formatted employee to the formatted arr
		formatted.push(employee);
		// exit once formatted
		if (formatted.length === ret1[0].length) {
			console.info(
				`Finished formatting ${formatted.length} entries. Displaying...`
			);
			renderTables(formatted);
			home(hcb);
		} else {
			console.info(`Formatted up to ${formatted.length}, continuing...`);
		}
	});
}
/**
 * Add a department via query for the department name.
 * @param {Number} hcb An integer used to call back to the home function.
 */
async function addDepartment(hcb) {
	// update the primitive repres
	await updatePrim();
	inquirer
		.prompt([
			{
				message: "This department's name (30 characters):",
				name: "name",
				type: "input",
				validate: function (inp, hash) {
					if (inp.length <= 30) return true;
					else return "Department name must be 30 characters or less";
				},
			},
		])
		.then(async (res) => {
			// insert the name into the department table
			return await db
				.promise()
				.query(
					`INSERT INTO department (name) VALUES ("${res["name"]}")`
				);
		})
		.then(async (res) => {
			// if the query failed, the res will be empty and we should force exit to avoid any errors.
			if (res) {
				// rejoin the tables and return home
				await rejoin();
				home(hcb);
			} else process.exit(1);
		});
}
/**
 * Add a role via query for the department selection, salary, and role name.
 * @param {Number} hcb An integer used to call back to the home function.
 */
async function addRole(hcb) {
	await updatePrim();
	const depChoices = [];
	let depid;
	dbprim.forEach((dep) => {
		depChoices.push(dep["name"]);
	});
	const getDepID = function (name) {
		console.log(`getDepID() recieved param "name" as ${name}`);
		dbprim.forEach((dep) => {
			if (dep["name"] == name) {
				console.log(`returning ${dep["id"]}`);
				depid = dep["id"];
			}
		});
	};
	inquirer
		.prompt([
			{
				message: "This role's title:",
				name: "title",
				type: "input",
				validate: function (inp, hash) {
					if (inp.length <= 30) return true;
					else return "Role title must be 30 characters or less";
				},
			},
			{
				message: "This role's salary (number):",
				name: "salary",
				type: "input",
				validate: function (inp, hash) {
					if (typeof parseInt(inp) === "number") return true;
					else return "Salaray must be a number";
				},
			},
			{
				message: "This role's department:",
				name: "department_name",
				type: "list",
				choices: depChoices,
			},
		])
		.then(async (res) => {
			let department_id = getDepID(res["department_name"]);
			return await db.promise()
				.query(`INSERT INTO role (title, salary, department_id)
        VALUES ('${res["title"]}', ${res["salary"]}, ${depid})`);
		})
		.then(async (res) => {
			if (res) {
				await rejoin();
				home(hcb);
			} else process.exit(1);
		});
}
/**
 * Add an employee via query for the employees name, department selection, role selection, and manager selection.
 * @param {Number} hcb An integer used to call back to the home function.
 */
async function addEmployee(hcb) {
	await updatePrim();
	let depChoices = [];
	let roleChoices = [];
	let roleByDep = {};
	dbprim.forEach((dep) => {
		if (!dep["roles"].length) return;
		depChoices.push(dep["name"]);
		roleByDep[`${dep["name"]}`] = [];
		dep["roles"].forEach((role) => {
			roleByDep[`${dep["name"]}`].push(role["title"]);
		});
	});

	inquirer
		.prompt([
			{
				message:
					"This employee's department (only departments with defined roles can be selected):",
				name: "department",
				type: "list",
				choices: depChoices,
			},
		])
		.then((res0) => {
			roleChoices = roleByDep[res0["department"]];
			inquirer
				.prompt([
					{
						message: "This employee's role:",
						name: "role",
						type: "list",
						choices: roleChoices,
					},
					{
						message: "This employee's first name:",
						name: "first_name",
						type: "input",
						validate: function (inp, hash) {
							if (inp.length <= 30) return true;
							else
								return "Employee first name cannot exceed 30 characters";
						},
					},
					{
						message: "This employee's last name:",
						name: "last_name",
						type: "input",
						validate: function (inp, hash) {
							if (inp.length <= 30) return true;
							else
								return "Employee last name cannot exceed 30 characters";
						},
					},
					{
						message:
							"Assign this employee a manager? (The manager must already be an employee)",
						name: "add_manager",
						type: "confirm",
					},
					{
						message:
							"Assign this manager by id or find them with first and last name? (by name is not implmented yet)",
						name: "find_manager_by",
						type: "list",
						choices: [
							{ value: true, name: "Assign by id" },
							// { value: false, name: "Find by name" },
						],
						when: function (hash) {
							return !!hash["add_manager"];
						},
					},
					{
						message: "Manager's ID:",
						name: "manager_id",
						type: "input",
						validate: function (inp, hash) {
							if (typeof parseInt(inp) === "number") return true;
							else return "Manager's ID must be a number";
						},
						when: function (hash) {
							return (
								!!hash["add_manager"] &&
								!!hash["find_manager_by"]
							);
						},
					},
					{
						message: "(Find Manager) Manager's first name:",
						name: "manager_first_name",
						type: "input",
						validate: function (inp, hash) {
							if (inp.length <= 30) return true;
							else
								return "Employee's names are no longer than 30 characters. (Maybe this manager was inputted under an alias?)";
						},
						when: function (hash) {
							return (
								!!hash["add_manager"] &&
								!hash["find_manager_by"]
							);
						},
					},
					{
						message: "(Find Manager) Manager's last name:",
						name: "manager_last_name",
						type: "input",
						validate: function (inp, hash) {
							if (inp.length <= 30) return true;
							else
								return "Employee's names are no longer than 30 characters. (Maybe this manager was inputted under an alias?)";
						},
						when: function (hash) {
							return (
								!!hash["add_manager"] &&
								!hash["find_manager_by"]
							);
						},
					},
				])
				.then(async (res) => {
					let managerID = "NULL";
					const roleIDQ = await db
						.promise()
						.query(`SELECT id FROM role WHERE title='unassigned'`);
					let roleID = roleIDQ[0][0]["id"];
					if (!!res["add_manager"]) {
						if (!!res["find_manager_by"])
							managerID = res["manager_id"];
						else {
							managerID = await db.promise()
								.query(`SELECT id FROM employee 
                    WHERE first_name="${res["manager_first_name"]}" AND last_name="${res["manager_last_name"]}"`);
						}
					}
					const selRole = await db
						.promise()
						.query(
							`SELECT id FROM role WHERE title='${res["role"]}'`
						);
					if (selRole[0][0]["id"]) roleID = selRole[0][0]["id"];
					await db.promise()
						.query(`INSERT INTO employee (first_name, last_name, role_id, manager_id)
            VALUES ("${res["first_name"]}", "${res["last_name"]}", ${roleID}, ${managerID})`);
					home(hcb);
				});
		});
}
async function updateRole(hcb) {
	await updatePrim();
	let depChoices = [];
	let roleChoices = [];
	let roleByDep = {};
	dbprim.forEach((dep) => {
		if (!dep["roles"].length) return;
		depChoices.push(dep["name"]);
		roleByDep[`${dep["name"]}`] = [];
		dep["roles"].forEach((role) => {
			roleByDep[`${dep["name"]}`].push(role["title"]);
		});
	});
	// await viewAllEmployees(); // TODO: the hope is that the user can use this to view all employees before searching, but doing so causes a memorey leak!
	inquirer
		.prompt([
			{
				message:
					"Search for employee by ID or by first and last name? (by name is not implmented yet)",
				name: "option",
				type: "list",
				choices: [
					{ value: true, name: "Search by ID" },
					// { value: false, name: "Search by name" },
				],
			},
			{
				message: "Employee ID:",
				name: "employee_id",
				type: "input",
				validate: function (inp, hash) {
					if (typeof parseInt(inp) === "number") return true;
					else return "Employee's ID must be a number";
				},
				when: function (hash) {
					return !!hash["option"];
				},
			},
			{
				message: "Employee First Name:",
				name: "first_name",
				type: "input",
				validate: function (inp, hash) {
					if (inp.length <= 30) return true;
					else
						return "Employee's names are no longer than 30 characters. (Maybe this employee was inputted under an alias?)";
				},
				when: function (hash) {
					return !hash["option"];
				},
			},
			{
				message: "Employee Last Name:",
				name: "last_name",
				type: "input",
				validate: function (inp, hash) {
					if (inp.length <= 30) return true;
					else
						return "Employee's names are no longer than 30 characters. (Maybe this employee was inputted under an alias?)";
				},
				when: function (hash) {
					return !hash["option"];
				},
			},
			{
				message: "Select a department to switch user to",
				name: "department",
				type: "list",
				choices: depChoices,
			},
		])
		.then(async (res) => {
			roleChoices = roleByDep[res["department"]];
			inquirer
				.prompt([
					{
						message: "Select a role to switch user to",
						name: "role",
						type: "list",
						choices: roleChoices,
					},
				])
				.then(async (resRole) => {
					const roleIDQ = await db
						.promise()
						.query(`SELECT id FROM role WHERE title='unassigned'`);
					let roleID = roleIDQ[0][0]["id"];
					const selRole = await db
						.promise()
						.query(
							`SELECT id FROM role WHERE title='${resRole["role"]}'`
						);
					if (selRole[0][0]["id"]) roleID = selRole[0][0]["id"];
					let employeeID;
					if (!!res["option"]) employeeID = res["employee_id"];
					else {
						employeeID = await db.promise()
							.query(`SELECT id FROM employee 
                WHERE first_name="${res["first_name"]}" AND last_name="${res["last_name"]}"`);
					}
					await db
						.promise()
						.query(
							`UPDATE employee SET role_id=${roleID} WHERE id=${employeeID}`
						);
					home();
				});
		});
}
/**
 * Safely exit the program using process.exit()
 * @param {Number} hcb An integer used to call back to the home function.
 */
function exit(hcb) {
	inquirer
		.prompt([
			{
				message:
					"All changes have been saved. Are you sure you want to exit?",
				name: "option",
				type: "confirm",
			},
		])
		.then((selection) => {
			if (!selection["option"]) home(hcb);
			else {
				console.clear();
				console.info("Goodbye!");
				process.exit();
			}
		});
}
/**
 * Contains all the other functions which the user can access via inquirer.
 * @param {Number} _start The selection that inquirer should start on. Generally the last selected option.
 */
function home(_start = 1) {
	inquirer
		.prompt([
			{
				message: "Please select one of the following options",
				name: "option",
				type: "list",
				choices: [
					new inquirer.Separator(`----VIEW----`),
					{ value: 1, name: "View all departments" },
					{ value: 2, name: "View all roles" },
					{ value: 3, name: "View all employees" },
					new inquirer.Separator(`----ADD----`),
					{ value: 4, name: "Add a department" },
					{ value: 5, name: "Add a role" },
					{ value: 6, name: "Add an employee" },
					{
						value: 7,
						name: "Populate employees with default seeds.",
					},
					new inquirer.Separator(`----UPDATE----`),
					{ value: 8, name: "Update an employee's role" },
					new inquirer.Separator(`----EXIT----`),
					{ value: 9, name: "Exit" },
					{ value: 0, name: "Force Exit" },
				],
				default: _start - 1,
				loop: false,
			},
		])
		.then((selection) => {
			let r = selection["option"];
			if (!r) process.exit();
			switch (r) {
				case 9:
					exit(9);
					break;
				case 1:
					viewAllDepartments(1);
					break;
				case 2:
					viewAllRoles(2);
					break;
				case 3:
					viewAllEmployees(3);
					break;
				case 4:
					addDepartment(4);
					break;
				case 5:
					addRole(5);
					break;
				case 6:
					addEmployee(6);
					break;
				case 7:
					seed(7);
					break;
				case 8:
					updateRole(8);
					break;
			}
		});
}
/**
 * Rejoin the tables
 */
async function rejoin() {
	await db.promise().query(`SELECT * FROM role
    JOIN department ON role.department_id = department.id;`);

	await db.promise().query(`SELECT * FROM employee
    JOIN role ON employee.role_id = role.id;`);

	await db.promise().query(`SELECT * FROM employee
    JOIN employee AS manager ON employee.manager_id = manager.id;`);
}
/**
 * Initialize the tables
 */
function initTables() {
	let cb = (e, r) => {
		if (e) console.error(`initTables() encountered an error: ${e}`);
	};
	db.query(
		`CREATE TABLE IF NOT EXISTS department (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(30) NOT NULL,
        PRIMARY KEY (id)
    );`,
		cb
	);
	db.query(
		`CREATE TABLE IF NOT EXISTS role (
        id INT NOT NULL AUTO_INCREMENT,
        title VARCHAR(30) NOT NULL,
        salary DECIMAL(10,2) NOT NULL,
        department_id INT NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY (department_id) REFERENCES department(id)
    );`,
		cb
	);
	db.query(
		`CREATE TABLE IF NOT EXISTS employee (
        id INT NOT NULL AUTO_INCREMENT,
        first_name VARCHAR(30) NOT NULL,
        last_name VARCHAR(30) NOT NULL,
        role_id INT NOT NULL,
        manager_id INT,
        PRIMARY KEY (id),
        FOREIGN KEY (role_id) REFERENCES role(id),
        FOREIGN KEY (manager_id) REFERENCES employee(id) ON DELETE SET NULL
    );`,
		cb
	);
}
/**
 * Initialize the unnasigned functions.
 */
async function unassigneds() {
	const createdDepQ = await db
		.promise()
		.query(`SELECT * FROM department WHERE name='unassigned'`);
	if (!createdDepQ[0].length) {
		await db
			.promise()
			.query(`INSERT INTO department (name) VALUES ('unassigned')`);
	}
	const unassignedDepID = await db
		.promise()
		.query(`SELECT id FROM department WHERE name='unassigned'`);
	console.log(unassignedDepID);
	const createdRoleQ = await db
		.promise()
		.query(`SELECT * FROM role WHERE title='unassigned'`);
	if (!createdRoleQ[0].length) {
		await db.promise()
			.query(`INSERT INTO role (title, salary, department_id)
        VALUES ('unassigned', 0, ${unassignedDepID[0][0]["id"]})`);
	}
}
/**
 *
 * @param {Number} hcb Seed the database with random data.
 */
function seed(hcb) {
	const cb = (e, r) => {
		if (e) console.error(`seed() encountered an error: ${e}`);
	};
	db.query(
		`INSERT INTO department (name)
    VALUES ('Sales'),
        ('Engineering'),
        ('Finance'),
        ('Legal');
    `,
		cb
	);
	db.query(
		`INSERT INTO role (title, salary, department_id)
    VALUES ('Sales Lead', 100000, 2),
        ('Salesperson', 80000, 2),
        ('Senior Software Engineer', 182000, 3),
        ('Junior Software Engineer', 122000, 3),
        ('Accountant Supervisor', 150000, 4),
        ('Accountant', 125000, 4),
        ('Legal Team Lead', 250000, 5),
        ('Lawyer', 190000, 5);
    `,
		cb
	);
	db.query(
		`INSERT INTO employee (first_name, last_name, role_id, manager_id)
    VALUES ('John', 'Doe', 2, NULL),
        ('Mike', 'Chan', 3, 1),
        ('Ashley', 'Rodriguez', 4, NULL),
        ('Kevin', 'Tupik', 4, 3),
        ('Malia', 'Brown', 6, NULL),
        ('Sarah', 'Lourd', 7, 5),
        ('Tom', 'Allen', 8, NULL),
        ('Sam', 'Clemens', 9, 7),
        ('Harold', 'Jones', 3, 1),
        ('Sally', 'Smith', 3, 1);
    `,
		cb
	);
	console.clear();
	console.info(`Seeded!`);
	home(hcb);
}
// main function run on startup
async function main() {
	initTables();
	await unassigneds();
	await rejoin();
	console.clear();
	home();
}
main();
