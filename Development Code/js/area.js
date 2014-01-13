/*************************************************************************
* the area class definition for use for polygons
*
* Parameters:
* name - string - the name of the polygon for use in the right menu
* code - string - the unique code for use in referencing this object
* contains - string - descriptive text for the polygon, used in the info window when someone clicks on the rendered
*					  polygon on the map
* borderColor - string - a color for use on the border of the polygon
* fillColor - string - a color for use to fill the polygon
* map - url - an absolute path to the location of the KML file that defines this polygon
* polygon - object - a google maps polygon object for this object
* elementID - string - the id of the HTML element used in the menu to represent this object
* globals - object literal - an object containing the window and document objects {win: window, doc: document}
* state - int - represents whether the polygon is being shown or not, 0 no, 1 yes
* hidden - bool - for use in the search function to know if this Area object matches the search criteria and should be rendered or not
*/
function Area() {
	this.name = arguments[0],
	this.code = arguments[1],
	this.info = arguments[2],
	this.lineColor = arguments[3][0].lineColor;
	this.fillColor = arguments[3][0].polyColor;
	this.polygons = this.createPolygons(arguments[3]);
	this.numberOfPolygons = this.polygons.length;
	this.elementID = this.code + "_poly",
	this.globals = arguments[4];
	this.state = 0,
	this.hidden = false;

	//attaches all of the info window events on the polygons
	this.attachInfoWindowEvents();
}


//builds a DOM object and it's HTML for this Area object for use in the right menu
Area.prototype.buildAreaDOM = function() {
	var element = this.globals.doc.createElement("a");
	element.className = "object polygon";
	element.id = this.elementID;
	element.setAttribute('href', '#' + this.code);
	element.innerHTML = '<div class="polygon_key" id="poly_' + this.name + '" style="border-color:' + this.lineColor + '; background-color:' + this.fillColor + '"><span>&nbsp;</span></div>';
    element.innerHTML += '<div class="object_name polygon">' + this.name + '</div>';

    return element;
}


//builds this object's MapKey html
Area.prototype.buildMapKey = function () {
	return '<div class="polygon_key" id="poly_key_' + this.code + '" style="border-color:' + this.borderColor + '; background-color:' + this.fillColor + '">' + this.code + '</div>';
}


//binds the event listener for the HTML element in the right menu that represents this object
Area.prototype.bindEventListener = function() {
	var area = this;
	campusMap.addClickHandler(this.globals.doc.getElementById(this.elementID), function(event) {
		event.preventDefault();
		area.globals.win.location.hash = area.code;
		area.togglePolygon();
	});
}


//toggle whether the polygon is showing or not
Area.prototype.togglePolygon = function() {
	//get the span for this polygon
	var span = this.globals.doc.getElementById(this.elementID).children[0].children[0];
	var polyKey = this.globals.doc.getElementById("poly_key_" + this.code);
	//currently closed
	if (this.state === 0) {
		this.showPolygons(span, polyKey);
	} 
	//currently open
	else if (this.state === 1) {
		this.hidePolygons(span, polyKey);
	}
}


//shows the polygon on the map and in the MapKey
Area.prototype.showPolygons = function(span, polyKey) {
	for (var i = 0; i < this.numberOfPolygons; i++) {
		this.polygons[i].setVisible(true);
	}
	if (campusMap.includeMenus) {
		span.className = "icon-checkmark";
		
		//display the mapkey
		polyKey.parentElement.style.display = "block";
		//make it appear in the map key
		polyKey.className = "polygon_key active_key";
	}
	this.state = 1;
}


//hides the polygon on the map and in the MapKey
Area.prototype.hidePolygons = function(span, polyKey) {
	for (var i = 0; i < this.numberOfPolygons; i++) {
		this.polygons[i].setVisible(false);
	}
	if (campusMap.includeMenus) {
		span.className = "";
	
		polyKey.className = "polygon_key";
		//determine if the mapkey needs to be closed or not
		if (this.globals.doc.querySelectorAll('#' + polyKey.parentElement.id + " .active_key").length < 1) {
			polyKey.parentElement.style.display = "none";
		}
	}	
	this.state = 0;
}


//creates all of the polygons for this Area object
Area.prototype.createPolygons = function(polygons) {
	var newPolygons = [];
	//loop through all of the polygons
	for (var i = 0, len = polygons.length; i < len; i++) {
		var coordinates = [];
		for (var j = 0, len2 = polygons[i].coordinates.length; j < len2; j++) {
			var coords = polygons[i].coordinates[j];
			coordinates.push(new google.maps.LatLng(coords[0], coords[1]));
		}
		newPolygons[i] = this.createPolygon(coordinates, polygons[i].lineColor, 1, 2, polygons[i].polyColor, 0.75);
		newPolygons[i].setMap(map.map);
	}
	return newPolygons;
}


//creates a polygon for this area object
Area.prototype.createPolygon = function(coordinates, strokeColor, strokeOpacity, strokeWeight, fillColor, fillOpacity) {
	return new google.maps.Polygon({
		paths: coordinates,
		strokeColor: strokeColor,
		strokeOpacity: strokeOpacity,
		strokeWeight: strokeWeight,
		fillColor: fillColor,
		fillOpacity: fillOpacity,
		visible: false
	})
}


//hides both the polygon on the map(and mapkey) and in the right navigation
Area.prototype.hideAll = function() {
	if (campusMap.includeMenus) {
		this.hideMapKey();
		this.hideNavigation();
	}
}


//hides the HTML representing this object in the MapKey
Area.prototype.hideMapKey = function() {
		//get the span for this polygon
	var span = (campusMap.includeMenus) ? this.globals.doc.getElementById(this.elementID).children[0].children[0] : undefined;
	var polyKey = (campusMap.includeMenus) ? this.globals.doc.getElementById("poly_key_" + this.code) : undefined;
		//make sure that it is not checked and therefore not showing up in the map
	this.hidePolygons(span, polyKey);
}

//hides the HTML element that represents this object in the navigation
Area.prototype.hideNavigation = function() {
	this.hidden = true;
	//hide it in the left navigation
	this.globals.doc.getElementById(this.elementID).style.display = "none";
}


//shows both the polygon on the map(and mapkey) and in the right navigation
Area.prototype.showAll = function() {
	if (campusMap.includeMenus) {
		this.showMapKey();
		this.showNavigation();
	}
}

//shows the HTML representing this object in the MapKey
Area.prototype.showMapKey = function() {
	//show in mapkey
	var span = (campusMap.includeMenus) ? this.globals.doc.getElementById(this.elementID).children[0].children[0] : undefined;
	var polyKey = (campusMap.includeMenus) ? this.globals.doc.getElementById("poly_key_" + this.code) : undefined;
	this.showPolygons(span, polyKey);
}


//shows the HTML element that represents this object in the navigation
Area.prototype.showNavigation = function() {
	this.hidden = false;
	this.globals.doc.getElementById(this.elementID).style.display = "block";
}

//attaches all of the events onto each polygon when it is loaded on the google map
Area.prototype.attachInfoWindowEvents = function() {
	for (var i = 0; i < this.numberOfPolygons; i++) {
		map.createPolygonInfoWindow(this.polygons[i], this);
	}
}