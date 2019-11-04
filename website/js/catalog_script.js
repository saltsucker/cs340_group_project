/***************
* Global Vars  *
***************/
var HEADER_NAMES = ["album_id", "artist_name", "album_name", "genre", "quantity_on_hand", "wholesale_cost", "customer_cost"];
var COLUMNS = HEADER_NAMES.length+2;	// +2 is to add the Edit & Delete button
var ROWS = 1;
var TABLE_ID = "dataTable";

/***************
* Create Table *
***************/
// Create table attributes
var body = document.getElementsByTagName("body")[0];
var table = document.createElement("table");
var tBody = document.createElement("tbody");

// Add id's to table
table.setAttribute("id", TABLE_ID);

// Create header row
var row = document.createElement("tr");

for(var j = 0; j < COLUMNS; j++){
	// Create header cells if on top row, else, normal cell
	var col = document.createElement("th");
	col.setAttribute("id", "header");

	// If this is the first cell, do nothing, it will be hidden
	if(j != COLUMNS-1){
		// Style table
		col.style.border = '1px solid gray';
	}

	// Add column to row
	row.appendChild(col);
}

// Add row to table
tBody.appendChild(row);

// Add table body to table
table.appendChild(tBody);

// Add table to body
body.appendChild(table);

// Retrieve existing Database and build table
retrieveDB(TABLE_ID, row);

// ADD NAME TO HEADERS
var headers = body.getElementsByTagName("th");

for(i = 0; i < headers.length; i++){
	if(i == headers.length-1){
		headers[i].textContent = " ";
	}
	else{
		headers[i].textContent = HEADER_NAMES[i];
	}


// TEMPORRARY, DELETE TO FILL IN ACTUAL DATA
var data = {};
buildTable(0, data);
}

function deleteRow(tableID, button){
	try{
		// Get current row
		var table = document.getElementById(tableID);
		var rowCount = table.rows.length;
		var currentRow = button.parentElement.parentElement;

		// CHECK AND MAKE SURE THERE'S NO LESS THAN 1 INFORMATION ROW.
		//	IF THERE IS, DON'T DELETE ANYTHING.
		if(rowCount >= 3){

			for(var i = 0; i < rowCount; i++){
				var row = table.rows[i];

				if(row == currentRow){
					currentRow = row;
					break;
				}
			}

			// Setup POST request
			var req = new XMLHttpRequest();

			req.open('POST', 'http://flip3.engr.oregonstate.edu:50261/delete', true);
			req.setRequestHeader('Content-Type', 'application/json');

			req.addEventListener('load', function(){			
				// Request was okay
				if (req.status > 199 && req.status < 400){
					
					if(req.response != null){
						var response = req.response;
					}
					var data = parseData(response);

					var table = document.getElementById(tableID);
					var rowCount = table.rows.length;
					var currentRow = button.parentElement.parentElement;

					for(var i = 0; i < rowCount; i++){
						var row = table.rows[i];

						if(row == currentRow){
							if(rowCount < 3){
								alert("Cannot delete all the rows.");
								break;
							}
							table.deleteRow(i);
							rowCount--;
							i--;
						}
					}
				}
				else{
					// Something went wrong
					console.log("Error in GET delete request: " + req.statusText)
				}
			});

			/*************INFORMATION FOR POST****************/
			var payload = {id : currentRow.getAttribute("id")};
			jsonPayload = JSON.stringify(payload);

			// Send request
			req.send(jsonPayload);
		}
		else{
			alert("Can not delete all rows.");
		}

	}
	catch(e){
		alert(e);
	}
}

function editRow(tableID, button){
	try{
		// Do stuff with the table
		var table = document.getElementById(tableID);
		var rowCount = table.rows.length;
		var currentRow = button.parentElement.parentElement;

		// Get cells in the row
		var textFields = currentRow.getElementsByTagName("input");

		// If button is "editable" already, call the function to stop editing
		if(button.className){
			stopEditRow(tableID, button);
			return;
		}
		else{
			// Change button look
			button.className = "editButton";
			button.innerHTML = "Editing";
		}

		for(var i = 0; i < textFields.length; i++){
			textFields[i].readOnly = false;
			textFields[i].className = "editRow";
		}
		
	}
	catch(e){
		alert(e);
	}
}

function stopEditRow(tableID, button){
	try{
		var req = new XMLHttpRequest();

		// Do stuff with the table
		var table = document.getElementById(tableID);
		var rowCount = table.rows.length;
		var currentRow = button.parentElement.parentElement;

		// Change button text to inform user they are done editing the row
		button.innerHTML = "Edit";

		// Get cells in the row
		var textFields = currentRow.getElementsByTagName("input");

		for(var i = 0; i < textFields.length; i++){
			textFields[i].readOnly = true;
			textFields[i].className = "";
		}

		button.className = "";

		// Gather information to send information to server to update Database
		var textFields = currentRow.getElementsByTagName("input");

		var name = textFields[0].value;
		var reps = textFields[1].value;
		var weight = textFields[2].value;
		var date = textFields[3].value;
		var unit = textFields[4].value;
		var id = currentRow.getAttribute("id");

		// Check if user entered in kgs or lbs
		if(unit == 'lbs' || unit == 'lb' || unit == 'pound' || unit == 'pounds' || unit == 0){
			unit = 0;
		}
		else if(unit == 'kgs' || unit == 'kg' || unit == 'kilograms' || unit == 1){
			unit = 1;
		}

		var payload = {"name": name, "reps": reps, "weight": weight, "date": date, "unit": unit, "id":id};

		req.open('POST', 'http://flip3.engr.oregonstate.edu:50261/edit', true);
		req.setRequestHeader('Content-Type', 'application/json');

		req.addEventListener('load', function(){			
			// Request was okay
			if (req.status > 199 && req.status < 400){
				// Parse data and put in array
				if(req.response != null){
					var response = req.response;
				}
				var data = parseData(response);

				// Add text back into the row with information sent back from the server
				for(key in data[0]){
				 	if(key){
						var id = key + "_" + data[0]['id'];
						document.getElementById(id).value = data[0][key];
					}
				}
			}
			else{
				// Something went wrong
				console.log("Error in POST request: " + req.statusText)
			}
		});

		var jsonPayload = JSON.stringify(payload);

		// Send request
		req.send(jsonPayload);
	}
	catch(e){
		alert(e);
	}
}

/**********************
* Doing necessary parsing of data
*	we get from the server
**********************/
function parseData(response){
	var dict = JSON.parse(response);
	dict = dict.results;

	
	for(var i = 0; i < dict.length; i++){
		// Split the date to get rid of trailing "T" values
		if(dict[i]['date']){
			var date = dict[i]['date'].split("T")[0];
		}
		dict[i]['date'] = date;

		// Change unit to 'lbs' or 'kgs'
		if(dict[i]['unit'] == 0){
			dict[i]['unit'] = 'lbs';
		}
		else{
			dict[i]['unit'] = 'kg';
		}
	}

	return dict;
}

function retrieveDB(tableID, button){
	try{
		var req = new XMLHttpRequest();	

		req.open('GET', 'http://flip3.engr.oregonstate.edu:50261/retrieve', true);

		req.addEventListener('load', function(){			
			// Request was okay
			if (req.status > 199 && req.status < 400){
				// Parse data and put in array
				if(req.response != null){
					var response = req.response;
				}

				var data = parseData(response);

				buildTable(tableID, data);
			}
			else{
				// Something went wrong
				console.log("Error in GET request: " + req.statusText)
			}
		});

		// Send request
		req.send(null);

	}
	catch(e){
		alert(e);
	}
}

function addToDB(tableID, button){
	try{
		var req = new XMLHttpRequest();	

		// Get data in the form
		var name = document.getElementById("addForm").elements["name"].value;
		var reps = document.getElementById("addForm").elements["reps"].value;
		var weight = document.getElementById("addForm").elements["weight"].value;
		var date = document.getElementById("addForm").elements["date"].value;
		var unit = document.getElementById("addForm").elements["unit"];

		// If lbs is checked, set unit to 0, else kg == 1
		if(unit[0].checked){
			unit = 0;
		}
		else{
			unit = 1;
		}
		if(name != ""){
			console.log("name: " + name);
			var getString = "name=" + name + "&reps=" + reps + "&weight=" + weight +
							"&date=" + date + "&unit=" + unit;

			req.open('GET', 'http://flip3.engr.oregonstate.edu:50261/insert?' + getString, true);

			req.addEventListener('load', function(){			
				// Request was okay
				if (req.status > 199 && req.status < 400){
					// Parse data and put in array
					if(req.response != null){
						var response = req.response;
					}
					var data = parseData(response);

					buildTable(tableID, data);
				}
				else{
					// Something went wrong
					console.log("Error in GET request: " + req.statusText)
				}
			});

			// Send request
			req.send(null);
		}
		else{
			alert("Name must be a value. Exercise not added to Database.");
		}

	}
	catch(e){
		alert(e);
	}
}

function buildTable(tableID, data){
	// Get first table body in table
	//var tBody = document.getElementById(tableID).tBodies[0];
	var tBody = document.getElementById("dataTable").tBodies[0];

	// ["album_id", "artist_name", "album_name", "genre", "quantity_on_hand", "wholesale_cost", "customer_cost"];
	var dict = {"album_id":1, "artist_name":"Green Day", "album_name": "Dookie", "genre":"Rock", "quantity_on_hand":100,
				"wholesale_cost":"6.99", "customer_cost":"9.99"};
	var data = [dict];

	for(var i = 0; i < data.length; i++){
		// Create rows
		var row = document.createElement("tr");
		var rowCount = table.rows.length;
		
		// Add columns
		for(var j = 0; j < COLUMNS; j++){
			var col = document.createElement("td");

			// If we're in the last cell (column), make it hidden and id
			if(j == COLUMNS-1){
				var hiddenField = document.createElement("input");
				hiddenField.setAttribute("type", "hidden");
				// hiddenField.setAttribute("name", "id");
				hiddenField.setAttribute("id", "id_" + data[i]['id']);
				col.appendChild(hiddenField);
			}
			else{
				// If we're not in the last 2 columns, add a textfield
				if(j < COLUMNS-2){
					// Add text field
					var textField = document.createElement("input");
					textField.setAttribute("id", HEADER_NAMES[j].toLowerCase() + "_" + data[i]['id']);
					textField.readOnly = true;
					col.appendChild(textField);
				}
				// If we're in the 2nd to last column, add buttons
				else if(j == COLUMNS-2){
					// Create edit button
					var button = document.createElement("BUTTON");
					button.addEventListener("click", function(){ editRow(TABLE_ID, this) });
					button.innerHTML = "Edit";
					col.append(button);
			
					// Create delete button
					button = document.createElement("BUTTON");
					button.addEventListener("click", function(){ deleteRow(TABLE_ID, this) });
					button.innerHTML = "Delete";
					col.append(button);
				}

				// Style td
				col.style.border = '1px solid gray';
			}

			// Add column to row
			row.appendChild(col);
			row.setAttribute("id", data[i]['id']);
		}

		// Add row to table
		tBody.appendChild(row);

		// Fill in text data
		for(key in data[i]){
		 	if(key){
				var id = key + "_" + data[i]['id'];
				document.getElementById(id).value = data[i][key];
			}
		}
	}
}