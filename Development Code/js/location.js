/*********************************************************************************
* the location class definition is for use by markers
* uses the arguments parameter
* 
* Parameters
* number - int - this is the number of the Location object within a category, it is mainly
*				 used when giving it a number in the menu and on the map
* name - string - the name of the Location, used in the right menu
* code - string - a unique code given to each Location and Area object so that they can be referenced
* lat - float - the latitude of the location, in decimal format
* lon - float - the longitude of the location, in decimal format
* img - url - an absolute or relative path to an image to be displayed on the infowindow with this Location
* hours - string - text representing the hours of such a building, this is optional
* info - string - any informative text for this location
* link - url - an absolute or relative path to a webpage with more information about the location, this is optional
* color - string - a color that matches it's category for use in finding the correct icon markers
* elementID - string - the id of the element in the menu that represents this Location object
* marker - object - a google maps marker object for this location
* globals - object literal - an object with the window and document object in it {win: window, doc: document}
* hidden - bool - used for the searching to know if this Location matches the search criteria and should be displayed or not
*/
function Location() {
	this.number = arguments[8] + 1,
	this.name = arguments[0],
	this.code = arguments[1],
	this.lat = arguments[2],
	this.lon = arguments[3],
	this.img = arguments[4],
	this.hours = arguments[5],
	this.info = arguments[6],
	this.link = arguments[7],
	this.icon = arguments[10],
	this.elementID = this.code + "_" + this.number, 
	this.marker,
	this.globals = arguments[9],
	this.hidden = false;

	//when the object is created we want to create a google maps marker and add the event
	//listener to build the infowindow
	this.createMarker();
	this.createInfoWindow();
}


//builds a DOM object for this Location for use in the right menu
Location.prototype.buildLocationDOM = function() {
	var element = this.globals.doc.createElement("a");
	element.className = "object marker_object";
	element.id = this.elementID;
	element.name = this.name;
	element.setAttribute("href", "#" + this.code);
    element.innerHTML += '<img  class="obj_icon" src="'+ this.icon + '" alt="' + name + '" />';
    element.innerHTML +=   '<div class="object_name">' + this.name + '</div>';

    return element;
}


//binds the event listener to the HTML element that represents this object in the right menu
//to open it on the map
Location.prototype.bindEventListener = function() {
	var marker = this;
	campusMap.addClickHandler(this.globals.doc.getElementById(this.elementID),function(event) {
		event.preventDefault();
		marker.globals.win.location.hash = marker.code;
		marker.panToMarker();
	});
}


//pans to the marker in the google map
Location.prototype.panToMarker = function() {
	var moveEnd = google.maps.event.addListener(map, 'moveend', function() {
    var markerOffset = map.map.fromLatLngToDivPixel(this.marker.getPosition());
      google.maps.event.removeListener(moveEnd);
    });
    map.map.panTo(this.marker.getPosition());
    google.maps.event.trigger(this.marker, 'click');
}


//creates a google maps marker for this object
Location.prototype.createMarker = function() {
	this.marker = map.createMarker(this.lat, this.lon, this.name, this.icon)
}


//create the info window for this object
Location.prototype.createInfoWindow = function() {
	map.createInfoWindow(this.marker, this);
}


//hides the marker on the map and in the menu
Location.prototype.hideAll = function() {
	this.hideNavigation();
	if (campusMap.includeMenus) {
		this.hideMarker();
	}
}


//hides the marker on the map for this object
Location.prototype.hideMarker = function() {
	this.marker.setVisible(false);
}


//hides the HTML element in the right menu that represents this object
Location.prototype.hideNavigation = function() {
	this.hidden = true;
	//hide it in the navigation and then hide it on the map
	this.globals.doc.getElementById(this.elementID).style.display = "none";
}


//shows the marker on the map and the element in the menu
Location.prototype.showAll = function() {
	this.showMarker();
	if (campusMap.includeMenus) {
		this.showNavigation();
	}
}


//shows the marker on the map
Location.prototype.showMarker = function() {
	this.marker.setVisible(true);
}


//shows the HTML element in the menu
Location.prototype.showNavigation = function() {
	this.hidden = false;
	this.globals.doc.getElementById(this.elementID).style.display = "block";
}