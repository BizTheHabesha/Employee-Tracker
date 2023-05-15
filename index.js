const inquirer = require('inquirer');
const {Department, Role, Employee} = require('./lib/sql-helpers')
const mysql = require('mysql2');
const db = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'freecreditreport.com',
        database: 'business_db'
    },
    console.log(`Connected to the business_db database.`)
);
/** 
 * @deprecated 
 * Uses console.log() to render an array of objects in a simpler table format than console.table(). Also ignores stdstream and indeces.
 * This function is rudementary and not optimized for streams (or at all). You are better off using another package or using node's 
 * standard console.table() method and has been phased out of the employee tracker all together. The decleration is still here because I
 * spent too long on this.
 * @param {Object[]} arr An array of objects.
 * @param {Number} _padding A number indicating how much white space there should be between columns (1) (optional)
 * @param {String} _hsep A string seperator to use instead of dashes ('-') (optional).
 * @param {String} _hhsep A string seperator to use instead of equal signs, which is only used below the table definitions ('=') (optional).
 * @param {String} _vsep A string seperator to use instead of pipes ('|') (optional).
 * @param {String} _ws A string to fill the whitespace in the table instead of space (' ') (optional)
 */
function renderTables(arr,_padding = 2, _hsep = '-', _hhsep = '=', _vsep = '|', _ws = ' '){
    // a local function which will return a string of repeated characters. The length of the string and the characters in question are passed in.
    let charLen = (char, len)=>{
        // all contexts of this function will require the padding.
        len+=_padding;
        // will hold our string
        let ret = '';
        // append the character as many times as requested.
        for(let i = 0; i < len; i++){
            ret =  ret.concat(char);
        }
        return ret;
    }
    // ensure the array passed is an array
    if(!Array.isArray(arr)) throw new Error(`renderTables expected paramter 'arr' to be an array, recieved ${arr}`);
    // holds longest length entries for each key
    let buffers = {};
    // initialize the buffers object with the keys and a starting value of 0.
    // NOTE: this will cause a memory leak as Object.keys() is a prototype
    Object.keys(arr[0]).forEach(key=>buffers[key] = 0);
    // loop through each object in the array
    arr.forEach(obj => {
        // check the type of each object
        if(!(typeof obj === 'object')) throw new Error(`renderTables expected parameter 'arr' to be an array of objects, recieved ${arr}`);
        // loop through the keys of this object
        Object.keys(obj).forEach(key => {
            // check falsy, which in our case is either a 0 or null. sql will not return undefined
            if(!obj[key]) obj[key] = 'none';
            // check that the type of each entry is a string, if not convert it to string
            if(typeof obj[key] !== 'string') obj[key] = String(obj[key]);
            // if buffers is not defined as some key, make it 0. this should be caught by the initiliazaiton above, but evil js pointers 
            // means this will not work without this second backup
            if(!buffers[key]) buffers[key] = 0;
            // if the length of this key's entry is longer than the buffer for that key, set the buffer to this length
            if(obj[key].length > buffers[key]) buffers[key] = obj[key].length;
            // doubly check if the key itself is longer. This could be the initliaztion by looping through any one object once, which we do below
            // but again, evil js pointers means every nested Object.keys() could result in memory leaks
            if(key.length > buffers[key]) buffers[key] = key.length;
        })
    });
    // will hold the total length of the table
    let totalLen = 0;
    // add each buffer to the length b/c the buffers are the length of each column
    Object.keys(buffers).forEach(key=>{
        totalLen+=buffers[key];
    })
    // will hold the title of the table (i.e. the keys)
    let tableTitle = '';
    // concat each key to the title followed by remaining buffer and padding with white space
    Object.keys(arr[0]).forEach(key=>{
        tableTitle = tableTitle.concat(key).concat(charLen(_ws,(buffers[key]-key.length)));
    });
    // log out the title
    console.log(tableTitle);
    // log out a divider. never long enough? issue with code? will blame evil js pointers instead.
    console.log(charLen(_hhsep,totalLen));
    // loop through each object
    arr.forEach(obj => {
        // will hold the row
        let line = '';
        // loop through each key of the object
        Object.keys(obj).forEach(key => {
            // append the entry and any buffer and padding remaining
            line = line.concat(obj[key].concat(charLen(_ws,(buffers[key])-obj[key].length)));
        });
        // log out this row.
        console.log(line);
    });
}
function viewAllDepartments(){
    home();
}
function viewAllRoles(){

}
function viewAllEmployees(){
    let formatted = [];
    db.query(`SELECT * FROM employee`, (e,r) => {
        if(e)console.error(`viewAllEmployees() encountered an error: ${e}`);
        else{
            r.forEach(employee => {
                console.log(employee);
                db.query(`SELECT title FROM ROLE WHERE id="${employee['role_id']}"`,(err,res)=>{
                    if(err) console.log(err);
                    db.query(`SELECT first_name FROM EMPLOYEE WHERE id="${employee['manager_id']}"`, (err1, res1)=>{
                        if(err1) console.error(err1);
                        else{
                            employee['title'] = res[0]['title'];
                            console.log(res1);
                            employee['manager'] = res1[0] ? res1[0]['first_name'] : null;
                            delete employee['role_id'];
                            delete employee['manager_id'];
                            formatted.push(employee);
                            if(formatted.length === r.length){
                                renderTables(formatted);
                                home();
                            }
                        }
                    })
                })
            })
        }
    })
}
function addDepartment(){
    home();
}
function addRole(){
    home();
}
function addEmployee(){
    home();
}
function updateRole(){
    home();
}
function exit(){
    inquirer.prompt([
        {message:'All changes have been saved. Are you sure you want to exit?', name:'option', type:'confirm'}
    ])
    .then(selection => {
        if(!selection['option']) home();
        else process.exit();
    })
}
function home(){
    inquirer.prompt([
        {message: 'Please select one of the following options', name:'option', type:'list', choices:[
            new inquirer.Separator(`----VIEW----`),
            {value: 1, name:'View all departments'},
            {value: 2, name:'View all roles'},
            {value: 3, name:'View all employees'},
            new inquirer.Separator(`----ADD----`),
            {value: 4, name:'Add a department'},
            {value: 5, name:'Add a role'},
            {value: 6, name:'Add an employee'},
            {value: 7, name:'Populate employees with default seeds.'},
            new inquirer.Separator(`----UPDATE----`),
            {value: 8, name:"Update an employee's role"},
            new inquirer.Separator(`----EXIT----`),
            {value: 9, name:'Exit'},
            {value: 0, name:'Force Exit'}
        ], default: 'Add a department', loop: false}
    ])
    .then(selection => {
        let r = selection['option'];
        if(!r) process.exit();
        switch (r) {
            case 9:
                exit();
                break;
            case 1:
                viewAllDepartments();
                break;
            case 2:
                viewAllRoles();
                break;
            case 3:
                viewAllEmployees();
                break;
            case 4:
                addDepartment();
                break;
            case 5:
                addRole();
                break;
            case 6:
                addEmployee();
                break;
            case 7:
                seed();
                break;
            case 8:
                updateRole();
                break;
        }
    })
}
function rejoin(){
    let cb = (e,r) => {
        if(e) console.error(`rejoin() encountered an error: ${e}`)
    }
    db.query(`SELECT * FROM role
    JOIN department ON role.department_id = department.id;
    `,cb);

    db.query(`SELECT * FROM employee
    JOIN role ON employee.role_id = role.id;
    `,cb);

    db.query(`SELECT * FROM employee
    JOIN employee AS manager ON employee.manager_id = manager.id;
    `,cb);   
}
function initTables(){
    let cb = (e, r) => {
        if(e) console.error(`initTables() encountered an error: ${e}`)
    }
    db.query(`CREATE TABLE IF NOT EXISTS department (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(30) NOT NULL,
        PRIMARY KEY (id)
    );`, cb);
    db.query(`CREATE TABLE IF NOT EXISTS role (
        id INT NOT NULL AUTO_INCREMENT,
        title VARCHAR(30) NOT NULL,
        salary DECIMAL(10,2) NOT NULL,
        department_id INT NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY (department_id) REFERENCES department(id)
    );`, cb);
    db.query(`CREATE TABLE IF NOT EXISTS employee (
        id INT NOT NULL AUTO_INCREMENT,
        first_name VARCHAR(30) NOT NULL,
        last_name VARCHAR(30) NOT NULL,
        role_id INT NOT NULL,
        manager_id INT,
        PRIMARY KEY (id),
        FOREIGN KEY (role_id) REFERENCES role(id),
        FOREIGN KEY (manager_id) REFERENCES employee(id) ON DELETE SET NULL
    );`, cb);
}
function seed(){
    const cb = (e, r) => {
        if(e) console.error(`seed() encountered an error: ${e}`);
    }
    db.query(`INSERT INTO department (name)
    VALUES ('Sales'),
        ('Engineering'),
        ('Finance'),
        ('Legal');
    `,cb);
    db.query(`INSERT INTO role (title, salary, department_id)
    VALUES ('Sales Lead', 100000, 1),
        ('Salesperson', 80000, 1),
        ('Senior Software Engineer', 182000, 2),
        ('Junior Software Engineer', 122000, 2),
        ('Accountant Supervisor', 150000, 3),
        ('Accountant', 125000, 3),
        ('Legal Team Lead', 250000, 4),
        ('Lawyer', 190000, 4);
    `,cb);
    db.query(`INSERT INTO employee (first_name, last_name, role_id, manager_id)
    VALUES ('John', 'Doe', 1, NULL),
        ('Mike', 'Chan', 2, 1),
        ('Ashley', 'Rodriguez', 3, NULL),
        ('Kevin', 'Tupik', 4, 3),
        ('Malia', 'Brown', 5, NULL),
        ('Sarah', 'Lourd', 6, 5),
        ('Tom', 'Allen', 7, NULL),
        ('Sam', 'Clemens', 8, 7),
        ('Harold', 'Jones', 2, 1),
        ('Sally', 'Smith', 2, 1);
    `,cb);
}
function main(){
    initTables();
    rejoin();
    home();
}
main();