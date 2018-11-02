//Server-side code for the admins website

//Server set-up
/*eslint-disable no-param-reassign */
const path = require(`path`);
const mysql = require('./dbcon.js');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const _ = require("lodash");
const session = require("express-session"); //for session tracking
const handlebars = require('express-handlebars').create({defaultLayout:'main'});

app.use('/static', express.static('public'));
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('mysql', mysql);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
  secret: "thisisapassword1",
  resave: false,
  saveUninitialized: false
          }));
session.loggedIn = 0;

/* ******************* Test Page Admin******************* */
/*
 *       <tr v-for="admin in admins">
        <td>{{ admin.admin_id }}</td>
        <td>{{ admin.email }}</td>
        <td>{{ admin.password }}</td>
		<td>{{ admin.creation_date }}</td>
 */
app.get('/pageAdmin', (req, res) => {
    console.log("Testing pageAdmin handlebars");
    var context = {admins: [
    	{admin_id: 1, email: "test@gmail.com", password: "test", creation_date: '11/2/2018'},
    	{admin_id: 2, email: "test@gmail.com", password: "test", creation_date: '11/2/2018'},
    	{admin_id: 3, email: "test@gmail.com", password: "test", creation_date: '11/2/2018'},
    	{admin_id: 4, email: "test@gmail.com", password: "test", creation_date: '11/2/2018'}
    ]};
    res.render('pageAdmin', context);
});


/* ******************* Login Functions ******************* */

//display login page
app.get('/', function(req, res) {
    console.log("in login.js get");
    var context = {};
    res.render('login', context);
});

app.get("/logOut", function(req, res){
  if (session.loggedIn) {
    session.loggedIn = 0;
  }
  res.redirect("/");
});

const checkUserLogin = (email, password) => {
	var SQL = "SELECT user_id, fname FROM users WHERE email = ? AND password = ?";
	var inserts = [email, password];
	return new Promise((resolve, reject) => {
		mysql.pool.query(SQL, inserts, (error, results) => {
	      if (!_.isEmpty(results)) {
	      	resolve({id: results[0].user_id, name: results[0].fname});
	      }
	      reject(error);
    	});
	})
	.catch(() => null);
};

const checkAdminLogin = (email, password) => {
	var SQL = "SELECT admin_id FROM administrators WHERE email = ? AND password = ?";
	var inserts = [email, password];
	return new Promise((resolve, reject) => {
		mysql.pool.query(SQL, inserts, (error, results) => {
	      if (!_.isEmpty(results)) {
	      	resolve({id: results[0].admin_id, name: email});
	      }
	      reject(error);
    	});
	})
	.catch(() => null);
};


app.post('/', (req, res) => {
	Promise.all([checkUserLogin(req.body.email, req.body.password), checkAdminLogin(req.body.email, req.body.password)])
		.then((results) => {
			if (results[0] !== null) {
				session.loggedIn = results[0].id;
				res.render('userLanding', results[0]);
			}
			else if (results[1] !== null) {
				session.loggedIn = results[1].id;
				res.render('adminLanding', results[1]);
			}
			else {
				res.render('loginError', {});
			}
		})
		.catch((err) => {
			console.log("Error in login attempt");
			console.log(err);
			res.render('loginError', {});
		});
});

app.post('/admins', (req, res) => {
	var context = {};

	//Check that email field exists in request
  if(req.body.email === null ||
		 req.body.email === undefined ||
		 req.body.email === "") {
		res.status(400).send('Error: email not found');
		return;
  }

	//Check that password field exists in request
	if(req.body.password === null ||
		 req.body.password === undefined ||
		 req.body.password === "") {
		res.status(400).send('Error: password not found');
		return;
	}

	//Check that creation_date field exists in request
	if(req.body.creation_date === null ||
		 req.body.creation_date === undefined ||
		 req.body.creation_date === "") {
		res.status(400).send('Error: creation date not found');
		return;
	}

	//Create variables to prepare data for insertion into table
	var sql = 'INSERT INTO administrators (email, password, creation_date) VALUES (?,?,?)';
	var record = [req.body.email, req.body.password, req.body.creation_date];

	//Insert row into administrators table
	mysql.pool.query(sql, record, function(err, result) {
			if(err) {
				console.log(err);
				JSON.stringify(err);
				res.status(400).send(err);
				return;
			}

			//TODO return id?
			res.status(200).end();
			return;
		});
});


/*------------- Get all admins -------------*/
app.get('/admins', (req, res) => {
	var context = {};
	var sql = 'SELECT * FROM administrators';

	mysql.pool.query (sql, function(err, rows, fields){
		if(err){
			console.log(err);
			JSON.stringify(err);
			res.status(400).send(err);
			return;
		}

		context.results = JSON.stringify(rows);
		console.log(context);
 		res.status(200).send(context);
	});
});


/*------------- Get a specific admin -------------*/
app.get('/admins/:admin_id', (req, res) => {
	var context = {};
	var sql = 'SELECT * FROM administrators WHERE admin_id = ?';

	mysql.pool.query (sql, req.params.admin_id, function(err, rows, fields){
		if(err){
			console.log(err);
			JSON.stringify(err);
			res.status(400).send(err);
			return;
		}

		context.results = JSON.stringify(rows);
		console.log(context);
 		res.status(200).send(context);
	});
});


/*------------- Edit an admin -------------*/
app.put('/admins/:admin_id', (req, res) => {
	var context = {};

	//Create variables to insert edited data into table
	var sql = 'UPDATE administrators SET email = ?, password = ?, creation_date = ? WHERE admin_id = ?';
	var record = [req.body.email,
							  req.body.password,
								req.body.creation_date,
							  req.params.admin_id];

	mysql.pool.query (sql, record, function(err, rows, fields){
		if(err){
			console.log(err);
			JSON.stringify(err);
			res.status(400).send(err);
			return;
		}

		context.results = JSON.stringify(rows);
		console.log(context);
 		res.status(200).send('Edit successful');
	});
});


/*------------- Delete an admin -------------*/
app.delete('/admins/:admin_id', (req, res) => {
	var context = {};y6,l;
	var sql = 'DELETE FROM administrators WHERE admin_id = ?';

	mysql.pool.query (sql, req.params.admin_id, function(err, rows, fields){
		if(err){
			console.log(err);
			JSON.stringify(err);
			res.status(400).send(err);
			return;
		}

		context.results = JSON.stringify(rows);
		console.log(context);
 		res.status(200).send('Delete successful');
	});
});


/* ******************* User Control Functions ******************* */

/*------------- Create a user -------------*/
app.post('/users', (req, res) => {
	var context = {};

	//Check that email field exists in request
  if(req.body.email === null ||
		 req.body.email === undefined ||
		 req.body.email === "") {
		res.status(400).send('Error: email not found');
		return;
  }

	//Check that password field exists in request
	if(req.body.password === null ||
		 req.body.password === undefined ||
		 req.body.password === "") {
		res.status(400).send('Error: password not found');
		return;
	}

	//Check that first name field exists in request
	if(req.body.fname === null ||
		 req.body.fname === undefined ||
		 req.body.fname === "") {
		res.status(400).send('Error: first name not found');
		return;
	}

	//Check that last name field exists in request
	if(req.body.lname === null ||
		 req.body.lname === undefined ||
		 req.body.lname === "") {
		res.status(400).send('Error: last name not found');
		return;
	}

	//Check that creation_date field exists in request
	if(req.body.creation_date === null ||
		 req.body.creation_date === undefined ||
		 req.body.creation_date === "") {
		res.status(400).send('Error: creation date not found');
		return;
	}

	//TODO Validation for TIMESTAMP format

	//Create variable to prepare data for insertion into table
	var sql = 'INSERT INTO users (email, password, creation_date, fname, lname) VALUES (?,?,?,?,?)';
	var record = [req.body.email,
							  req.body.password,
								req.body.creation_date,
								req.body.fname,
								req.body.lname];

	//Insert row into administrators table
	mysql.pool.query(sql, record, function(err, result) {
			if(err) {
				console.log(err);
				JSON.stringify(err);
				res.status(400).send(err);
				return;
			}

			//TODO return id?
			res.status(200).end();
			return;
		});
});


/*------------- Get all users -------------*/
app.get('/users', (req, res) => {
	var context = {};
	var sql = 'SELECT * FROM users';

	mysql.pool.query (sql, function(err, rows, fields){
		if(err){
			console.log(err);
			JSON.stringify(err);
			res.status(400).send(err);
			return;
		}

		context.results = JSON.stringify(rows);
		console.log(context);
 		res.status(200).send(context);
	});
});


/*------------- Get a specific user -------------*/
app.get('/users/:user_id', (req, res) => {
	var context = {};
	var sql = 'SELECT * FROM users WHERE user_id = ?';

	mysql.pool.query (sql, req.params.user_id, function(err, rows, fields){
		if(err){
			console.log(err);
			JSON.stringify(err);
			res.status(400).send(err);
			return;
		}

		context.results = JSON.stringify(rows);
		console.log(context);
 		res.status(200).send(context);
	});
});


/*------------- Edit a user -------------*/
app.put('/users/:user_id', (req, res) => {
	var context = {};

	//Create variables to insert edited data into table
	var sql = 'UPDATE users SET email = ?, password = ?, creation_date = ?, fname = ?, lname = ? WHERE user_id = ?';
	var record = [req.body.email,
							  req.body.password,
								req.body.creation_date,
								req.body.fname,
								req.body.lname,
							  req.params.user_id];

	mysql.pool.query (sql, record, function(err, rows, fields){
		if(err){
			console.log(err);
			JSON.stringify(err);
			res.status(400).send(err);
			return;
		}

		context.results = JSON.stringify(rows);
		console.log(context);
 		res.status(200).send('Edit successful');
	});
});


/*------------- Delete a user -------------*/
app.delete('/users/:user_id', (req, res) => {
	var context = {};
	var sql = 'DELETE FROM users WHERE user_id = ?';

	mysql.pool.query (sql, req.params.user_id, function(err, rows, fields){
		if(err){
			console.log(err);
			JSON.stringify(err);
			res.status(400).send(err);
			return;
		}

		context.results = JSON.stringify(rows);
		console.log(context);
 		res.status(200).send('Delete successful');
	});
});



/* ------------- Error Handling Functions ------------- */

//Error handling: 404
app.use(function(req, res) {
	res.status(404);
	res.header('Access-Control-Allow-Origin', '*');
	res.render('404');

});


//Error handling: 500
app.use(function(req, res) {
	res.status(500);
	res.header('Access-Control-Allow-Origin', '*');
	res.render('500');
});


/* ------------- Start Server ------------- */
if (module === require.main) {
  const server = app.listen(process.env.PORT || 8082, () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
}

module.exports = app;

