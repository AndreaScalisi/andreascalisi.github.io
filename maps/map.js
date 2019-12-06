/*
-------- STRUCTURE --------

-- MAIN FUNCTIONS --

	* drawMap()
	* famous_people()
	* heatMap()
	* arrondissements()
	* quartiers()


-- UTILITARY FUNCTIONS --
	
	* getData()
	* wikiSearch()
	* popupContent()
	* name_format()
	* checkBounds()
	* parse_rows()
	* getColor()
*/

//Global variables

const paris_coord = [48.864716, 2.349014];
drawMap(1884);

// ---- MAIN FUNCTIONS ----

//Function to draw the map with the clusters
async function drawMap(year, stored = true){
	const mymap = L.map('mapid', {minZoom: 12}).setView(L.latLng(paris_coord), 12);

	var mapboxUrl = "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw";
	var mapboxAttribution = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
		'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
		'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';
	var streets = L.tileLayer(mapboxUrl, {maxZoom: 20, attribution: mapboxAttribution, id: 'mapbox/streets-v11'})
	var light = L.tileLayer(mapboxUrl, {maxZoom: 20, attribution: mapboxAttribution, id: 'mapbox/light-v10'})
	var dark = L.tileLayer(mapboxUrl, {maxZoom: 20, attribution: mapboxAttribution, id: 'mapbox/dark-v10'})

	var url_1908 = "";
	var Map_1908 = L.tileLayer(url_1908);

	var url_1884 = "";
	var Map_1884 = L.tileLayer(url_1884);

	//var url_test = "https://exports.georeferencer.com/494969140585-2019-11-05T12:33:57.956925Z.tif";
	//var test = L.leafletGeotiff('data/carte_test.tif');
	//test.addTo(mymap);

	var baseMap = {
		"Streets": streets,
		"Light": light,
		"Dark": dark,
		"Map of 1884": Map_1884,
		"Map of 1908": Map_1908,
	}

	streets.addTo(mymap);


	//Use TileLayer.WMS to add the georeferenced map (need WMS of the georeferenced map!): https://leafletjs.com/reference-1.6.0.html#tilelayer-wms
		//See tutorial here: https://leafletjs.com/examples/wms/wms.html

	//Overlay ancient map of Paris: https://github.com/kartena/leaflet-tilejson
	//var imageUrl = 'http://www.lib.utexas.edu/maps/historical/newark_nj_1922.jpg',
    //imageBounds = [[47, 2], [49, 3]];
	//L.imageOverlay(imageUrl, imageBounds).addTo(mymap);

	var people = await famous_people(year);
	var people_Layer = L.layerGroup(people);

	var clusters_Layer = L.markerClusterGroup({
		singleMarkerMode: false //Show single elements as clusters of size 1
	});
	clusters_Layer.addLayers(people);

	var density_Layer_1884 = await heatMap(1884);
	var density_Layer_1908 = await heatMap(1908);

	var arr = await arrondissements(mymap, year, stored);
	var arr_Layer = L.layerGroup(arr);

	var quart = await quartiers(mymap, year, stored);
	var quart_Layer = L.layerGroup(quart);

	var overlayMap = {
		"People": people_Layer,
		"Clusters": clusters_Layer,
		"Density (1884)": density_Layer_1884,
		"Density (1908)": density_Layer_1908,
		"Arrondissements": arr_Layer,
		"Neighborhoods": quart_Layer
	}

	L.control.layers(baseMap, overlayMap).addTo(mymap);
}

//Function to draw the clusters
async function famous_people(year){
	var markers = [];
	data = await getData(year);
	for (var i = 0; i < data.lat.length; i++) {
		var lat = data.lat[i];
		var long = data.long[i];
		var name = data.names[i];
		var adr = data.addresses[i];
		if (checkBounds([lat,long])){	//Check if the address is in Paris
			var marker = L.marker(new L.LatLng(lat, long));
			marker.bindPopup(popupContent(name,adr));
			markers.push(marker);
		}	
	}
	
	return markers;
}

//Function to draw the heatmap to show the density of famous people in Paris
async function heatMap(year){
	data = await getData(year)
	coordinates = []
	for (var i = 0; i < data.lat.length; i++) {
		if (checkBounds([data.lat[i],data.long[i]])){
			coordinates.push([data.lat[i],data.long[i]])
		}
	}
	if (year == 1884){
		grad = {0.4: 'yellow', 0.65: 'orange', 1: 'red'};
	}
	if (year == 1908){
		grad = {0.4: 'green', 0.65: 'lime', 1: 'blue'};
	}
	var heat = L.heatLayer(coordinates, 
					{maxZoom: 20, 
					 radius: 25,
					 minOpacity: 0,
					 gradient: grad
				});

	return heat;
}

//Function to draw the Paris arrondissements on the map
//Data from: https://opendata.paris.fr/explore/dataset/arrondissements/information/?dataChart=eyJxdWVyaWVzIjpbeyJjb25maWciOnsiZGF0YXNldCI6ImFycm9uZGlzc2VtZW50cyIsIm9wdGlvbnMiOnsiYmFzZW1hcCI6Imphd2cuc3RyZWV0cyIsImxvY2F0aW9uIjoiMTIsNDguODUzMDgsMi4yNDk3OSJ9fSwiY2hhcnRzIjpbeyJhbGlnbk1vbnRoIjp0cnVlLCJ0eXBlIjoiY29sdW1uIiwiZnVuYyI6IkFWRyIsInlBeGlzIjoic3VyZmFjZSIsInNjaWVudGlmaWNEaXNwbGF5Ijp0cnVlLCJjb2xvciI6IiMwMDMzNjYifV0sInhBeGlzIjoibl9zcV9hciIsIm1heHBvaW50cyI6NTAsInNvcnQiOiIifV0sInRpbWVzY2FsZSI6IiIsImRpc3BsYXlMZWdlbmQiOnRydWUsImFsaWduTW9udGgiOnRydWV9&location=12,48.8515,2.32979&basemap=jawg.streets
async function arrondissements(map, year, stored){

	const path = "data/Polygons/arrondissements_Paris.csv"
	const response = await fetch(path);
	const data = await response.text();
	const arr_number = [];
	const arr_name = [];
	const rows = data.split('\n').slice(1);

	//Extract name and number of the arrondissement
	rows.forEach(row => {
		arr_number.push(row.split(";")[3]);
		arr_name.push(row.split(";")[4]);
	});
	arr_number.pop();
	arr_name.pop();

	//Parsing of the csv file to extract coordinates of the arrondissements
	const coordinates = parse_rows(rows);

	//Create polygons
	var polygons = [];
	for (var i = 0; i < coordinates.length; i++) {	
		polygons.push(L.polygon(coordinates[i], {fillOpacity: 0.4, color: 'white', dashArray: '4'}));
	}

	//Count the number of famous people within each arrondissement (if stored, read directly in .csv file)
	var counts = [];
	if (stored){
		const path_ = "data/Polygons/arr_counts_" + year + ".csv";
		const response = await fetch(path_);
		const data = await response.text();
		data.split(",").forEach(count => {
			counts.push(parseFloat(count));
		})
	} else {
		const people = await getData(year)
		var people_coord = []
		for (var i = 0; i < people.lat.length; i++) {
			if (checkBounds([people.lat[i],people.long[i]])){
				people_coord.push([people.lat[i],people.long[i]])
			}
		}

		for (var i = 0; i < coordinates.length; i++) {
			var count = 0;
			for (var j = 0; j < people_coord.length; j++) {
				if (polygons[i].contains(new L.latLng(people_coord[j]))) {
					count++;
				}
			}
			counts.push(count);
		}
	}

	//Color polygons given number of famous people inside
	for (var i = 0; i < polygons.length; i++) {
		polygons[i].setStyle({fillColor: getColor(counts[i],counts)});
	}

	//Add Tooltip content
	for (var i = 0; i < polygons.length; i++) {
		content = "<p><strong>N°: </strong> " + arr_number[i].slice(0,arr_number[i].length-4) +
				  "<br /><strong>Name: </strong>" + arr_name[i] + 
				  "<br /><strong>Number of famous people: </strong>" + counts[i] + "</p>"		
		polygons[i].bindTooltip(content, {opacity: 0.9});
	}

	//Add legend
	var legend = L.control({position: 'bottomright'});
	legend.onAdd = function (map) {
	    var div = L.DomUtil.create('div', 'info legend'),
	        grades = [4, 15, 25, 50],
	        labels = [];

	    // loop through our density intervals and generate a label with a colored square for each interval
	    for (var i = 0; i < grades.length; i++) {
	        div.innerHTML +=
	            '<i style="background:' + getColor(grades[i] + 1, counts) + '"></i> ' +
	            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
	    }
	    return div;
	}

	return polygons;	

}

//Function to draw the Paris neighborhoods on the map
//Data from: https://opendata.paris.fr/explore/dataset/quartier_paris/information/?location=12,48.88063,2.34695&basemap=jawg.streets
async function quartiers(map, year, stored){

	const path = "data/Polygons/quartier_paris.csv"
	const response = await fetch(path);
	const data = await response.text();
	const quart_number = [];
	const quart_name = [];
	const rows = data.split('\n').slice(1);

	//Extract name of the neighborhood
	rows.forEach(row => {
		quart_name.push(row.split(";")[3]);
	});	
	quart_name.pop();

	//Parsing of the csv file to extract coordinates of the neighborhoods
	const coordinates = parse_rows(rows);

	//Create polygons
	var polygons = [];
	for (var i = 0; i < coordinates.length; i++) {	
		polygons.push(L.polygon(coordinates[i], {fillOpacity: 0.4, color: 'white', dashArray: '4'}));
	}

	//Count the number of famous people within each neighborhoods (if stored, read directly in .csv file)
	var counts = [];
	if (stored){
		const path_ = "data/Polygons/quartiers_counts_" + year + ".csv";
		const response = await fetch(path_);
		const data = await response.text();
		data.split(",").forEach(count => {
			counts.push(parseFloat(count));
		})
	} else {
		const people = await getData(year)
		var people_coord = []
		for (var i = 0; i < people.lat.length; i++) {
			if (checkBounds([people.lat[i],people.long[i]])){
				people_coord.push([people.lat[i],people.long[i]])
			}
		}

		for (var i = 0; i < coordinates.length; i++) {
			var count = 0;
			for (var j = 0; j < people_coord.length; j++) {
				if (polygons[i].contains(new L.latLng(people_coord[j]))) {
					count++;
				}
			}
			counts.push(count);
		}
	}

	for (var i = 0; i < polygons.length; i++) {
		polygons[i].setStyle({fillColor: getColor(counts[i],counts)});
	}

	//Add Tooltip content
	for (var i = 0; i < polygons.length; i++) {
		content = "<p><strong>Name: </strong>" + quart_name[i] + 
				  "<br /><strong>Number of famous people: </strong>" + counts[i] + "</p>"		
		polygons[i].bindTooltip(content, {opacity: 0.9});
	}

	return polygons;
}

// ---- UTILITY FUNCTIONS ----

//Function to parse the data in the csv file
async function getData(year) {
	const path = 'data/final_' + year + '.csv'
	//console.log("Data from: " + path)
	const response = await fetch(path);
	const data = await response.text();
	const addresses = [];
	const names = [];
	const lat = [];
	const long = [];
	const rows = data.split('\n').slice(1);
	rows.forEach(row => {
	  const cols = row.split(',');
	  addresses.push(cols[0].trim());
	  names.push(cols[1]); //Some names return undefined, so no trim() possible here!
	  lat.push(parseFloat(cols[2]));
	  long.push(parseFloat(cols[3]));
	});
	return { addresses, names, lat, long };
}

//Function to search in Wikipedia for more information on the people 
function wikiSearch(name){
	name = name_format(name)
	//Url for the wiki search: name is the search term
	var url = "https://en.wikipedia.org/w/api.php?action=opensearch&search="+ name.replace(" ", "%20") +"&format=json&callback=?";

	$.ajax({
		url: url,
		type: "GET",
		dataType: "json",
		success: function(results, status){
			if (results[1].length > 0){
				link = results[3][0]
			} else {
				link = "No results found!"
			}
		},
		error: function(results, status, xhr){
			console.log(status)
		}
	})
}

//Function to create the content of the popups (ie relevant information on the person)
function popupContent(name,adr){
	name = name_format(name)
	if (typeof adr != "undefined"){
		adr = adr.trim()
	}
	content = "<p><strong>Name: </strong>" + name + "<br /><strong>Address: </strong>" + adr + "</p>"
	//link = ""
	//wikiSearch(name)
	//content = content + "<br /><strong>More info at</strong>: " + link

    return content;
}

//Function to format the name (Capitalize only first letter of each word)
function name_format(name){
	if (typeof name != "undefined"){
		name = name.trim()
	}	
	name_parts = name.split(" ")
	for (var i = 0; i<name_parts.length; ++i){
		if (name_parts[i].length > 0){
			name_parts[i] = name_parts[i][0].toUpperCase() + name_parts[i].slice(1).toLowerCase()
		}
	}
	name = name_parts.join(" ")
	return name
}

//Function to check if the addresses are in Paris
function checkBounds(people_coord){
	inParis = false;
	bound = [49,2.35];
	dist = math.distance(bound, paris_coord);
	dist_people = math.distance(people_coord, paris_coord);

	//Check for NaN values (note math.distance() return NaN if one parameter is NaN)
	if (dist_people != NaN){
		if (dist_people <= dist){
			inParis = true;
		}
	}

	return inParis;
}

//Function to extract coordinates from rows (used for quartiers() and arrondissements())
function parse_rows(rows){
	const geometry = [];
	const coordinates = [];

	rows.forEach(row => {
		const start = row.indexOf("{");
		const end = row.indexOf("}");
		geometry.push(row.slice(start,end));
	});
	geometry.forEach(geom => {
		const start = geom.indexOf("[");
		coordinates.push(geom.slice(start).slice(1,geom.length-3));
	});
	coordinates.pop();
	for (var i = 0; i < coordinates.length; i++) {
		coordinates[i] = coordinates[i].replace("[","").split("],");
		for (var j = 0; j < coordinates[i].length; j++) {
			coordinates[i][j] = coordinates[i][j].trim().slice(1);
			coordinates[i][j] = [parseFloat(coordinates[i][j].split(",")[1]), parseFloat(coordinates[i][j].split(",")[0])]
		}
	}
	return coordinates
}

//Function to choose fillColor of polygons as function of number of people inside
function getColor(d, all) {
	var prop = 100*d/Math.max(...all);
    return prop > 50 ? 'red' :
    	   prop > 25 ? 'orange' :
           prop > 15 ? 'lime' :
           prop > 4 ? 'blue':
           			  'grey'
}