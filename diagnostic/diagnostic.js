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
	mysql.pool.query('SELECT * FROM workouts', function(err, rows, fields){
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
	var list = [req.query.name, req.query.reps, req.query.weight, req.query.date, req.query.unit];

	// Insert row into table
	mysql.pool.query("INSERT INTO workouts (`name`, reps, weight, date, unit) VALUES(?, ?, ?, ?, ?)", list, function(err, result){
		if(err){
			next(err);
			return;
		}

		var insertId = result.insertId

		// Return data from the table in the database
		mysql.pool.query('SELECT * FROM workouts WHERE id=?', [insertId], function(err, rows, fields){
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
