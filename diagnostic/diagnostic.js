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

app.get('/retrieve',function(req,res,next){
	var context = {};

	if(req.query.table_name == "`order`"){
		// Retrieve the table with the given table_name
		
		mysql.pool.query('SELECT `order`.order_id, `order`.order_qty, total_sale, ' + 
						'`order`.date_sold, `order`.customer_id, customer.f_name, customer.l_name, ' +
						'album.album_name ' +
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
	else{
		// Retrieve the table with the given table_name
		mysql.pool.query('SELECT * FROM ' + req.query.table_name, function(err, rows, fields){
			if(err){
				next(err);
				return;
			}
			context.results = rows;
			res.send(context);
		});
	}	
});

app.post('/search',function(req,res,next){
	var context = {};
	
	if(req.body['table_name'] == "album"){
		var tableQuery = "SELECT * FROM album";	
	}
	else if(req.body['table_name'] == "order"){
		var tableQuery = 'SELECT `order`.order_id, `order`.order_qty, total_sale, ' + 
						'`order`.date_sold, `order`.customer_id, customer.f_name, customer.l_name, ' +
						'album.album_name ' +
						'FROM (customer INNER JOIN `order` ON `order`.customer_id = customer.customer_id INNER JOIN ' + 
						'order_album ON order_album.order_id = `order`.order_id INNER JOIN ' + 
						'album ON album.album_id = order_album.album_id) ORDER BY `order`.order_id ASC'
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


app.get('/insert', function(req, res, next){
	var context = {};
	var list = [req.query.retail_cost, req.query.wholesale_cost, req.query.album_name, req.query.artist_name, 
				req.query.genre, req.query.inventory];

	if(req.query.table_name == "album"){
		var tableQuery = "INSERT INTO album (retail_cost, wholesale_cost, album_name, artist_name, genre, inventory) VALUES(?, ?, ?, ?, ?, ?)";
	}

	// Insert row into table
	mysql.pool.query(tableQuery, list, function(err, result){
		if(err){
			next(err);
			return;
		}

		var insertId = result.insertId

		// Return data from the table in the database
		mysql.pool.query('SELECT * FROM album WHERE album_id=?', [insertId], function(err, rows, fields){
			if(err){
				next(err);
				return;
			}
			context.results = rows;
			res.send(context);
		});
	});
});

app.post('/edit', function(req, res, next){
	var context = {};
	var list = [req.body['name'], req.body['reps'], req.body['weight'], req.body['date'], req.body['unit'], req.body['id']];

	// Insert row into table
	mysql.pool.query("UPDATE workouts SET name=?, reps=?, weight=?, date=?, unit=? WHERE id=?", list, function(err, result){
		if(err){
			next(err);
			return;
		}

		// Return data from the table in the database
		mysql.pool.query('SELECT * FROM workouts WHERE id=?', req.body['id'], function(err, rows, fields){
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

	// Deleting row from table
	mysql.pool.query("DELETE FROM workouts WHERE id=?", req.body['id'], function(err, result){
		if(err){
			next(err);
			return;
		}
	
	  	// Return data from the table in the database
		mysql.pool.query('SELECT * FROM workouts ', function(err, rows, fields){
			if(err){
				next(err);
				return;
			}
			context.results = rows;
			res.send(context);
		});
	});
});

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
