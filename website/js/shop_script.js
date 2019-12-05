/***************
* Global Vars  *
***************/
var HEADER_NAMES = ["store_name", "street_address", "city", "state", "zip", "telephone", "sales"];
var COLUMNS = HEADER_NAMES.length+2;	// +2 is to add the Edit & Delete button
var ROWS = 1;
var TABLE_ID = "dataTable";
var TABLE_NAME = "record_shop";
var ID_NAME = "shop_id";
var SQLPORT = "58376"
//var SQLPORT = "50262"

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

			req.open('POST', 'http://flip3.engr.oregonstate.edu:' + SQLPORT + '/delete', true);
			req.setRequestHeader('Content-Type', 'application/json');

			req.addEventListener('load', function(){			
				// Request was okay
				if (req.status > 199 && req.status < 400){
					
					if(req.response != null){
						var response = req.response;
					}
					var data = parseData(response);

					// Delete table because we're going to rebuild it with new data
					deleteTable(tableID);

					// Build table back up with new data
					buildTable(tableID, data);
				}
				else{
					// Something went wrong
					console.log("Error in POST delete request: " + req.statusText)
				}
			});

			/*************INFORMATION FOR POST****************/
			// Get the first child/column of the row. This will be the order_id
			order_id = currentRow.cells[0].firstChild.value;

			var payload = {table_name: TABLE_NAME,
							id: order_id,
							id_name: ID_NAME};

			// console.log(currentRow)
			// console.log(payload);
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
			button.innerHTML = "Submit";
		}
		// Make the cells in the table editable so user can put in data
		for(var i = 0; i < textFields.length; i++){
			// Make a string out of the cell name
			var testString = String(textFields[i].getAttribute("id"));

			// If the name has "id" in it, we don't want to make it editable
			if(testString.indexOf("id") == -1){
				textFields[i].readOnly = false;
				textFields[i].className = "editRow";
			}
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

		//store_name, address, city, state, zip, phone_number, annual_sales
		var name = textFields[0].value;
		var address = textFields[1].value;
		var city = textFields[2].value;
		var state = textFields[3].value;
		var zip = textFields[4].value;
		var phone_number = textFields[5].value;
		var annual_sales = textFields[6].value;
		var id = currentRow.getAttribute("id");

		var payload = {"id" : id, "name": name, "address": address, "city": city, "state": state, "zip": zip, "phone_number": phone_number, "annual_sales" : annual_sales, "id_name" : ID_NAME};

		req.open('POST', 'http://flip3.engr.oregonstate.edu:' + SQLPORT + '/edit', true);
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
						var id = key + "_" + data[0][ID_NAME];
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
	return dict;
}
/* Gets the current data from the DB to be displayed */
function retrieveDB(tableID, button){
	try{
		var req = new XMLHttpRequest();	

		var getString = "table_name=" + TABLE_NAME;
		req.open('GET', 'http://flip3.engr.oregonstate.edu:' + SQLPORT + '/retrieve' + getString, true);

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

/* Gets the current data from the DB to be displayed */
function addToDB(tableID, button){
	try{
		var req = new XMLHttpRequest();	

		// Get data in the form
		//store_name, address, city, state, zip, phone_number, annual_sales
		var store_name = document.getElementById("add_shop").elements["store_name"].value;
		var address = document.getElementById("add_shop").elements["address"].value;
		var city = document.getElementById("add_shop").elements["city"].value;
		var state = document.getElementById("add_shop").elements["state"].value;
		var zip = document.getElementById("add_shop").elements["zip"].value;
		var phone_number = document.getElementById("add_shop").elements["phone_number"].value;
		var annual_sales = document.getElementById("add_shop").elements["sales"].value;

		if(store_name != ""){
			// store_name, address, city, state, zip
			console.log("name: " + store_name);
			var getString = "store_name=" + store_name + "&address=" + address + "&city=" + city +
							"&state=" + state + "&zip=" + zip + "&telephone_number=" + phone_number + "&annual_sales=" + annual_sales;

			req.open('GET', 'http://flip3.engr.oregonstate.edu:' + SQLPORT + '/insert?' + getString, true);

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
				hiddenField.setAttribute("id", "id_" + data[i][ID_NAME]);
				col.appendChild(hiddenField);
			}
			else{
				// If we're not in the last 2 columns, add a textfield
				if(j < COLUMNS-2){
					// Add text field
					var textField = document.createElement("input");
					textField.setAttribute("id", HEADER_NAMES[j].toLowerCase() + "_" + data[i][ID_NAME]);
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
			row.setAttribute("id", data[i][ID_NAME]);
		}

		// Add row to table
		tBody.appendChild(row);

		// Fill in text data
		for(key in data[i]){
		 // 	if(key){
			// 	var id = key + "_" + data[i]['album_id'];
			// 	document.getElementById(id).value = data[i][key];
			// }
			document.getElementById(key + "_" + data[i][ID_NAME]).value = data[i][key];
		}
	}
}

function search(tableID, button){
	try{
		var req = new XMLHttpRequest();

		var payload = {"table_name": "record_shop"};

		req.open('POST', 'http://flip3.engr.oregonstate.edu:' + SQLPORT + '/search', true);
		req.setRequestHeader('Content-Type', 'application/json');

		req.addEventListener('load', function(){			
			// Request was okay
			if (req.status > 199 && req.status < 400){
				// Parse data and put in array
				if(req.response != null){
					var response = req.response;
				}
				var data = parseData(response);

				// Get the search term that the user is searching for
				var searchQuery = document.getElementsByName("search_query")[0].value;

				// Trim any white spaces from the head or tail of the search query
				searchQuery = searchQuery.trim();

				// Need to store the indeces from data[] to keep after we search data for valid matches
				var iToKeep = [];

				// Go through the data returned in the table (should be all the table data)
				for(var i = 0; i < data.length; i++){
					// Set found flag to 0. I.e., assume we won't find the searchQuery
					var foundFlag = 0;

					// Each ith element of data[] will be a row in the table. Go through each row
					//	and search for searchQuery
					for(key in data[i]){
						// If the searchQuery is not in any of the data returned from the 
						//	table (i.e., it wasn't searched for), delete it from the dictionary
						if(String(data[i][key]).toLowerCase().indexOf(searchQuery) >= 0){
							foundFlag = 1;
						}
					}
					if(foundFlag){
						iToKeep.push(i);
					}
				}

				// Add the items we want to keep to a new array
				var filteredData = [];

				for(var i = 0; i < iToKeep.length; i++){
					indexToKeep = iToKeep[i];
					filteredData.push(data[indexToKeep]);
				}

				// Delete table because we're going to rebuild it with new data
				deleteTable(tableID);

				// Build table with filtered search data
				buildTable(tableID, filteredData);

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

function deleteTable(tableID){
	// Delete table rows (minus header rows) if one exists
	var table = document.getElementById(tableID);
	
	for(var i = table.rows.length-1; i > 0; i--){
		table.deleteRow(i);
	}
}
