/****************
 * Required outside resources
 ****************/
var dbcon = require('../../node_modules/dbcon.js');

/***************
* Global Vars  *
***************/
var HEADER_NAMES = ["order_id", "f_name", "l_name", "artist_name", "album_name", "order_qty", "date_sold", "total_sale"];
var COLUMNS = HEADER_NAMES.length+2;	// +2 is to add the Edit & Delete button
var ROWS = 1;
var TABLE_ID = "dataTable";
var TABLE_NAME = "order";
var ID_NAME = "order_id";
var SQLPORT = "50261";

// Populate customer list
populateCustomerList();

// Populate album name list
populateAlbumNames();

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
					console.log("Error in GET delete request: " + req.statusText)
				}
			});

			/*************INFORMATION FOR POST****************/
			// Get cells in the row
			var textFields = currentRow.getElementsByTagName("input");

			// Go through the cells and match whatever attributes we need and set variables
			for(var i = 0; i < textFields.length; i++){
				// Make a string out of the cell name
				var testString = String(textFields[i].getAttribute("id"));

				// If the name has "id" in it, we don't want to make it editable
				if(testString.indexOf("order_id") > -1){
					order_id = textFields[i].value;
				}
				else if(testString.indexOf("album_name") > -1){
					album_name = textFields[i].value;
				}
			}

			var payload = {"table_name": TABLE_NAME,
							"id": order_id,
							"id_name": ID_NAME,
							"album_name": album_name};

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
			if(testString.indexOf("id") == -1 &&
				testString.indexOf("name") == -1 &&
				testString.indexOf("order_qty") == -1){
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

		var date_sold = textFields[6].value;
		var total_sale = textFields[7].value;

		// Get id of row
			for(var i = 0; i < textFields.length; i++){
				// Make a string out of the cell name
				var testString = String(textFields[i].getAttribute("id"));

				// If the name has "id" in it, we don't want to make it editable
				if(testString.indexOf("order_id") > -1){
					var id = textFields[i].value;
				}
			}

		var payload = {"id": id, "date_sold": date_sold, "total_sale": total_sale,
						"table_name": TABLE_NAME, "id_name": ID_NAME};

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

				// Delete table because we're going to rebuild it with new data
				deleteTable(tableID);

				// Build table back up with new data
				buildTable(tableID, data);
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
		if(dict[i]['date_sold']){
			var date = dict[i]['date_sold'].split("T")[0];
		}
		dict[i]['date_sold'] = date;
	}

	return dict;
}

function retrieveDB(tableID, button){
	try{
		var req = new XMLHttpRequest();

		var getString = "table_name=`" + TABLE_NAME + "`";
		req.open('GET', 'http://flip3.engr.oregonstate.edu:' + SQLPORT + '/retrieve?' + getString, true);

		req.addEventListener('load', function(){			
			// Request was okay
			if (req.status > 199 && req.status < 400){
				// Parse data and put in array
				if(req.response != null){
					var response = req.response;
				}

				var data = parseData(response);

				// Build table
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

		// Get album names and split if there are multiple ones
		var album_name_string = document.getElementById("add_order").elements["album_names"].value;
		var album_names = album_name_string.split(",");

		// Get date sold
		var date_sold = document.getElementById("add_order").elements["date_sold"].value;

		// Get customer name and split into first and last name
		var customer_name = document.getElementById("customerList").value;
		var f_name = customer_name.split(" ")[0]
		var l_name = customer_name.split(" ")[1]

		// Get total sale amount
		var total_sales = document.getElementsByName("total_sale")[0].value;
		total_sales = total_sales.replace("$", "");

		if(customer_name != "" && album_names.length > 0 &&
			date_sold != "" && customer_name != ""){
			var getString = "table_name=" + TABLE_NAME + "&order_qty=" + album_names.length +
			"&total_sale=" + total_sales + "&date_sold=" + date_sold + 
			"&f_name=" + f_name + "&l_name=" + l_name;

			req.open('GET', 'http://flip3.engr.oregonstate.edu:' + SQLPORT + '/insert?' + getString, true);

			req.addEventListener('load', function(){			
				// Request was okay
				if (req.status > 199 && req.status < 400){
					// Parse data and put in array
					if(req.response != null){
						var response = req.response;
					}

					// After the order is entered (happened above), now add the 
					// relationship between the order and the album
					addOrderAlbum(album_names, tableID);

				}
				else{
					// Something went wrong
					console.log("Error in GET request: " + req.statusText)
				}
			});

			// Send request
			req.send(null);

			// Clear form
			resetForm();
		}
		else{
			alert("All fields required. Order not added to Database.");
		}

	}
	catch(e){
		alert(e);
	}
}

function resetForm(){
	document.getElementById("add_order").elements["album_names"].value = "";
	document.getElementsByName("total_sale")[0].value = "";
}

/*************************
* addOrderAlbum will add the relationship between album_names
* and the MAX(order_id). I.e., the order that was JUST entered
**************************/
function addOrderAlbum(album_names, tableID){
	try{
		var req = new XMLHttpRequest();

		var getString = "table_name=order_album" + "&album_names=" + album_names;

			req.open('GET', 'http://flip3.engr.oregonstate.edu:' + SQLPORT + '/insert?' + getString, true);

			req.addEventListener('load', function(){			
				// Request was okay
				if (req.status > 199 && req.status < 400){
					// Parse data and put in array
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

function searchBtn(tableID, button){
	// Uncomment all of below to get search working again
	try{
		var req = new XMLHttpRequest();
		var payload = {"table_name": TABLE_NAME};

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

function populateCustomerList(){
	try{
		var req = new XMLHttpRequest();

		var getString = "table_name=customer";
		req.open('GET', 'http://flip3.engr.oregonstate.edu:' + SQLPORT + '/retrieve?' + getString, true);

		req.addEventListener('load', function(){			
			// Request was okay
			if (req.status > 199 && req.status < 400){
				// Parse data and put in array
				if(req.response != null){
					var response = req.response;
				}

				var data = parseData(response);

				addCustomerNames(data);
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

function addCustomerNames(data){
	var customerList = document.getElementById("customerList");
	
	for(var i = 0; i < data.length; i++){
		var option = document.createElement("option");
		//option.text = data[i]["customer_id"] + "_" + data[i]["f_name"] + "_" + data[i]["l_name"];
		option.text = data[i]["f_name"] + " " + data[i]["l_name"];
		customerList.add(option);
		//console.log(data[i]["customer_id"]);
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
				hiddenField.setAttribute("id", i + "_" + "id_" + data[i][ID_NAME]);
				col.appendChild(hiddenField);
			}
			else{
				// If we're not in the last 2 columns, add a textfield
				if(j < COLUMNS-2){
					// Add text field
					var textField = document.createElement("input");

					// Change type of textField to date if in "date_sold" column
					if(HEADER_NAMES[j] == "date_sold"){
						textField.setAttribute("type", "date");
					}

					textField.setAttribute("id", i + "_" + HEADER_NAMES[j].toLowerCase() + "_" + data[i][ID_NAME]);
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
			// row.setAttribute("id", i + "_" + data[i][ID_NAME]);
		}

		// Add row to table
		tBody.appendChild(row);

		// Fill in text data
		for(key in data[i]){
			// Make sure this element exists in the table
			if(document.getElementById(i + "_" + key + "_" + data[i][ID_NAME])){
				document.getElementById(i + "_" + key + "_" + data[i][ID_NAME]).value = data[i][key];	
			}			
		 }
	}
}

function deleteTable(tableID){
	// Delete table rows (minus header rows) if one exists
	var table = document.getElementById(tableID);
	
	for(var i = table.rows.length-1; i > 0; i--){
		table.deleteRow(i);
	}
}

/*************************
* This function will populate the drop down menu with whatever
* album names are currently in the order table.
**************************/
function populateAlbumNames(){
	try{
		var req = new XMLHttpRequest();

		var getString = "table_name=album_names";
		req.open('GET', 'http://flip3.engr.oregonstate.edu:' + SQLPORT + '/retrieve?' + getString, true);

		req.addEventListener('load', function(){			
			// Request was okay
			if (req.status > 199 && req.status < 400){
				// Parse data and put in array
				if(req.response != null){
					var response = req.response;
				}

				var data = parseData(response);

				// Populate list with album names
				var albumDiv = document.getElementById("anamediv");
				for(var i = 0; i < data.length; i++){
					if(i == 0){
						// If this is the first element, make a "clear text box" option
						var aTag = document.createElement('a');
						aTag.setAttribute('href', "#");
						aTag.setAttribute('onclick', 'fillAlbumNameTextBox(this)');
						aTag.innerText = "clear text box";
						albumDiv.appendChild(aTag);
					}
					
					var aTag = document.createElement('a');
					aTag.setAttribute('href', "#");
					aTag.setAttribute('onclick', 'fillAlbumNameTextBox(this)');
					aTag.innerText = String(data[i]['album_name']).toLowerCase() + 
						" - $" + String(data[i]['retail_cost']);
					albumDiv.appendChild(aTag);
					
				}
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

// Fill in the album name text box from user clicking links
function fillAlbumNameTextBox(link){
	var linkText = String(link.text).split(" - ");
	var albumName = linkText[0];
	var cost = linkText[1];
	var albumNameBox = document.getElementsByName("album_names")[0];
	var totalSaleBox = document.getElementsByName("total_sale")[0];

	// Get current text if there is any
	currentNameText = albumNameBox.value;

	// Remove the "$" if cost exists
	if(cost){
		cost = cost.replace("$", "");
	}

	//console.log(currentTotal);

	// If user selected the "clear" option, clear the text box
	if(albumName.indexOf("clear") > -1){
		albumNameBox.value = "";
		totalSaleBox.value = "";
	}
	else if(!currentNameText){
		// If current text is empty, don't add a ','
		albumNameBox.value = albumName;
		totalSaleBox.value = "$" + cost;
	}
	else{
		// Fill in album names
		albumNameBox.value = currentNameText + ", " + albumName;

		// Update and fill in total cost
		var temp = totalSaleBox.value;
		temp = temp.replace("$", "");
		temp = parseFloat(temp) + parseFloat(cost);

		totalSaleBox.value = "$" + String(temp);
	}
}

 
