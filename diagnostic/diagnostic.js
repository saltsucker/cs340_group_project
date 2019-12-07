var express = require('express');
var mysql = require('./dbcon.js');
var cors = require('cors');

var app = express();
var handlebars = require('express-handlebars').create({defaultLayout:'main'});
var bodyParser = require('body-parser');

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', 50261);

app.use(function(req, res, next){
	res.header('Access-Control-Allow-Origin', '*');
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

	next();
});

app.get('/', function(req, res, next){
	var context = {};
	res.render('home',context);

});

/* RETRIEVE INFO FROM DATABASE TO BUILD THE TABLE IN HTML */ 
// THIS IS DONE
app.get('/retrieve',function(req,res,next){
	var context = {};

	if(req.query.table_name == "`order`"){ //special case for orders
		// Retrieve the table with the given table_name
		
		mysql.pool.query('SELECT `order`.order_id, `order`.order_qty, total_sale, ' + 
						'`order`.date_sold, customer.f_name, customer.l_name, ' +
						'album.album_name, album.artist_name ' +
						'FROM (customer INNER JOIN `order` ON `order`.customer_id = customer.customer_id INNER JOIN ' + 
						'order_album ON order_album.order_id = `order`.order_id INNER JOIN ' + 
						'album ON album.album_id = order_album.album_id) ORDER BY `order`.order_id ASC', function(err, rows, fields){
			if(err){
				next(err);
				return;
			}
			context.results = rows;
			res.send(context);
		});
	}
	else if(req.query.table_name == "album_names"){ //special case for album_names
		// This will retrieve just the album names for the order page
		mysql.pool.query('SELECT album_name, retail_cost FROM album ORDER BY album_name ASC', function(err, rows, fields){
			if(err){
				next(err);
				return;
			}
			context.results = rows;
			res.send(context);
		});
	}
	else if(req.query.table_name == "customer"){
		console.log("retriev was called for customer table")
		mysql.pool.query('SELECT * FROM customer', function(err, rows, fields){
			if(err) {
				next(err);
				return;
			}
			context.results = rows
			console.log(context)
			res.send(context);
		});
	}
	else{ // select rows from table for building
		// Retrieve the table with the given table_name
		mysql.pool.query('SELECT * FROM ' + req.query.table_name, function(err, rows, fields){
			console.log("select was called")
			if(err){
				next(err);
				return;
			}
			context.results = rows;
			res.send(context);
		});
	}	
});

/* SELECT VALUE FROM TABLE */
// THIS SHOULD BE DONE
app.post('/search',function(req,res,next){
	var context = {};
	console.log("search was called")
	
	if(req.body['table_name'] == "album"){
		var tableQuery = "SELECT * FROM album";	
	}
	else if(req.body['table_name'] == "order"){
		var tableQuery = getOrderTable();	
	}
	else if(req.body['table_name'] == "customer") {
		var tableQuery = "SELECT * FROM customer"
		console.log("customer select was called")
	}
	else {
		var tableQuery = "SELECT * FROM record_shop"
		console.log("shop select was called")
	}

	mysql.pool.query(tableQuery, function(err, rows, fields){
		if(err){
			next(err);
			return;
		}
		context.results = rows;
		res.send(context);
	});
	
});

/* INSERT QUERY INTO DB */
// this is not done yet
app.get('/insert', function(req, res, next){
	var context = {};
	var list;
	var tableQuery;
	var returnQueryId;
	
	if(req.query.table_name == "album"){
		tableQuery = "INSERT INTO album (retail_cost, wholesale_cost, album_name, artist_name, genre, inventory) VALUES(?, ?, ?, ?, ?, ?)";
		list = [req.query.retail_cost, req.query.wholesale_cost, req.query.album_name, req.query.artist_name, 
				req.query.genre, req.query.inventory];
		returnQueryId = "album_id";
	}
	else if(req.query.table_name == "order"){
		var tableQuery = insertOrderQuery(req);
		returnQueryId = "order_id";
	}
	else if(req.query.table_name == "order_album"){
		var tableQuery = insertOrderAlbumQuery(req.query.album_names);
	}
	else if(req.query.table_name == "customer") {
		var tableQuery = insertCustomerQuery(req);
	}
	// my other statements for inserting customer are on OSU server... so annoying.
	else if(req.query.table_name == "record_shop") {
		var tableQuery = insertShopQuery(req);
	}
	else {
		console.log("Insert did not work");
	}
	
	// Insert row into table
	mysql.pool.query(tableQuery, list, function(err, result){
		if(err){
			next(err);
			return;
		}

		// Return data from whatever table we're looking at in the database to rebuild the table on fly
		if(req.query.table_name == "customer") {
			var insertId = result.insertId;
			mysql.pool.query('SELECT * FROM customer WHERE customer_id=?', [insertId], function(err, rows, fields){
				if(err){
					next(err);
					return;
				}
				context.results = rows;
				res.send(context);
			});
		} 
		else if(req.query.table_name == "order_album"){
			mysql.pool.query(getOrderTable(), function(err, rows, fields){
				if(err){
					next(err);
					return;
				}
				context.results = rows;
				res.send(context);
			});
		}
		else if(req.query.table_name == "record_shop") {
			var insertId = result.insertId;
			mysql.pool.query('SELECT * FROM record_shop WHERE shop_id=?', [insertId], function(err, rows, fields){
				if(err){
					next(err);
					return;
				}
				context.results = rows;
				res.send(context);
			});
		} 
		else{
			var insertId = result.insertId;
			mysql.pool.query('SELECT * FROM album WHERE album_id=?', [insertId], function(err, rows, fields){
				if(err){
					next(err);
					return;
				}
				context.results = rows;
				res.send(context);
			});
		}
		
	});
});

/***********************
 * This function will insert an order into order query
 ***********************/
function insertOrderQuery(req){
	var customerQuery, shop_id;

	shop_id = "1";

	// Subquery: We will query the customer database with the given f_name and l_name
	customerQuery = '(SELECT customer_id FROM customer WHERE f_name = "' + req.query.f_name +
					'" AND l_name = "' + req.query.l_name + '")';
	
	var orderQuery = 'INSERT INTO `order` (order_qty, total_sale, date_sold, customer_id, shop_id) ' +
				'VALUES (' + req.query.order_qty + ',' + req.query.total_sale + ',\'' + req.query.date_sold + '\',' + 
				customerQuery + ',' + shop_id + '); \n';
	
	return orderQuery;
}

/*********************** 
 *  * This function will insert a customer into order query
 ************************/
function insertCustomerQuery(req){
	var customerQuery = "INSERT INTO customer (f_name, l_name, telephone_number) VALUES ('" + req.query.f_name + "', '" + req.query.l_name + "', '" + req.query.telephone_number + "')";
	return customerQuery;
}

/***********************
 * Sets up a query for insertion for record shop
 ***********************/
function insertShopQuery(req){
	//store_name, address, city, state, zip 
	var shopQuery = "INSERT INTO record_shop (name, address, city, state, zip, telephone_number, annual_sales)" 
		+ "VALUES ('"+req.query.store_name+"', '"+req.query.address+"', '"+req.query.city+"', '"+req.query.state+"', '"+req.query.zip+"', '"+req.query.phone_number+"', '"+req.query.annual_sales+"');"
	return shopQuery;
}

/**********************
 * This function will add the 
 * order_album query based on 
 * the MAX(order_id)
 **********************/
 function insertOrderAlbumQuery(album_names){
 	var album_names = album_names.split(",");
 	var query = 'INSERT INTO order_album (order_album.order_id, order_album.album_id) VALUES ';	
	var len = album_names.length;

	for(var i = 0; i < len; i++){
		query += '((SELECT MAX(`order`.order_id) FROM `order`), ' + 
			'(SELECT album.album_id FROM album WHERE album.album_name = "' + album_names[i].trim() + '"))';

		if(i < len-1){
			query += ", ";
		}
		else{
			query += ";";
		}
	}
	
	return query;
 }

app.post('/edit', function(req, res, next){
	var context = {};
	//var list = [req.body['name'], req.body['reps'], req.body['weight'], req.body['date'], req.body['unit'], req.body['id']];

	var queryList = [];
	var table_name = req.body['table_name'];
	var id_name = req.body['id_name'];
	
	// Do the query for album. Define:
	// 	queryList (the variables you'll be updating)
	// 	queryString (the actual query to the database)
	// 	returnQuery (what you want to be returned back to the front end html site)
	if(req.body['table_name'] == "album"){
		queryList = [req.body['artist_name'], req.body['album_name'], req.body['genre'], req.body['inventory'], req.body['wholesale_cost'], req.body['retail_cost'], req.body['id']];
		queryString = "UPDATE " + table_name + " SET artist_name=?, album_name=?, genre=?, inventory=?, wholesale_cost=?, retail_cost=?" +
						" WHERE " + id_name + "=?";
		returnQuery = "SELECT * FROM `" + table_name + "` WHERE " + id_name + "=?";
	}
	else if(table_name == "customer") {
		queryList = [req.body['f_name'], req.body['l_name'], req.body['tp_num'], req.body['id']];
		queryString = "UPDATE " + table_name + " SET f_name=?, l_name=?, telephone_number=?" + " WHERE " + id_name + "=?";
		returnQuery = "SELECT * FROM " + table_name + " WHERE " + id_name + "=?";
	}
	else if(table_name == "record_shop") {
		queryList = [req.body['name'], req.body['address'], req.body['city'], req.body['state'], req.body['zip'], req.body['phone_number'], req.body['annual_sales'], req.body['id']];
		queryString = "UPDATE " + table_name + " SET name=?, address=?, city=?, state=?, zip=?, phone_number=?, annual_sales=?" +
						" WHERE " + id_name + "=?";
		returnQuery = "SELECT * FROM " + table_name + " WHERE " + id_name + "=?";
	}
	else if (table_name == "order"){
		queryList = [req.body['date_sold'], req.body['total_sale'], req.body['id']];
		queryString = "UPDATE `" + table_name + "` SET date_sold=?, total_sale=?" + " WHERE " + id_name + "=?";
		//returnQuery = "SELECT * FROM `" + table_name + "` WHERE " + id_name + "=?";
		returnQuery = getOrderTable();
	}
	else {
		console.log("Edit did not work");
	}

	mysql.pool.query(queryString, queryList, function(err, result){

	// Insert row into table
		if(err){
			next(err);
			return;
		}

		// Return the row from the table in the database that we edited
		mysql.pool.query(returnQuery, req.body['id'], function(err, rows, fields){

			if(err){
				next(err);
				return;
			}
			context.results = rows;
			res.send(context);
		});
	});
});

app.post('/delete', function(req, res){
	var context = {};
	var table_name = req.body['table_name'];
	var id_name = req.body['id_name']; 		// Each table has its own unique id right? Order's is called order_id, Album's is album_id. We define the name here.
	var id_to_del = req.body['id'];			// We are passing in the id of the row we want to delete from the table.
	var returnQuery;
	var delQuery;							// May not need this. I need it for Order

	// Defining the query that we want to send back after we delete from the table
	if(table_name == "order"){
		delQuery = getOrderDelQuery(req.body['album_name']);
		returnQuery = getOrderTable(); // This is along query. It uses JOINS so I made it a function
	}
	else if(table_name == "album"){
		returnQuery = "SELECT * FROM album";
	}
	else if(table_name == "customer"){
		returnQuery = "SELECT * FROM customer";
	}
	else if(table_name == "record_shop"){
		returnQuery = "SELECT * FROM record_shop";
	}
	else {
		console.log("Can't delete row");
	}
	// Deleting row from table
	mysql.pool.query("DELETE FROM `" + table_name + "` WHERE " + id_name + "=?", id_to_del, function(err, result){
		if(err){
			next(err);
			return;
		}

		mysql.pool.query(returnQuery, function(err, rows, fields){
				if(err){
					next(err);
					return;
				}
				context.results = rows;
				res.send(context);
		});
	});
});

/************************************
 * This function returns a delete query from
 * the Order table where album_name = the parameter we're passing in
 ************************************/
 function getOrderDelQuery(album_name){
 	var delString;
	return delString;
 }

/*************************************
 * This function returns the order table query. This
 * query is long and I need it in a few places
 *************************************/
function getOrderTable(){
	var query;

	query =	'SELECT `order`.order_id, `order`.order_qty, total_sale, ' + 
				'`order`.date_sold, `order`.customer_id, customer.f_name, customer.l_name, ' +
				'album.album_name, album.artist_name ' +
				'FROM (customer INNER JOIN `order` ON `order`.customer_id = customer.customer_id INNER JOIN ' + 
				'order_album ON order_album.order_id = `order`.order_id INNER JOIN ' + 
				'album ON album.album_id = order_album.album_id) ORDER BY `order`.order_id ASC';

	return query;
}
/*
// DO WE NEED THIS?
app.get('/reset-table',function(req,res,next){
	var context = {};
	mysql.pool.query("DROP TABLE IF EXISTS workouts", function(err){ //replace your connection pool with the your variable containing the connection pool
		var createString = "CREATE TABLE workouts("+
	    "id INT PRIMARY KEY AUTO_INCREMENT,"+
	    "name VARCHAR(255) NOT NULL,"+
	    "reps INT,"+
	    "weight INT,"+
	    "date DATE,"+
	    "unit BOOLEAN)";
		mysql.pool.query(createString, function(err){
			context.results = "Table reset";
			res.render('home',context);
		})
	});
});
*/
app.use(function(req,res){
  res.status(404);
  res.render('404');
});

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500);
  res.render('500');
});

app.listen(app.get('port'), function(){
  console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});
