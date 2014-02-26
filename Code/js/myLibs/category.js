/********************************************************************************
* this is the definition for the category class
* uses arguments parameter to construct the object
*
* Parameters:
* id - int - the unqiue id of the category as defined in the CatObj JSON file
* name - string - the name of the category
* title - string - usually is the same as the name
* text - string - descriptive text about the category, shows up in the menu when you open the category
* iconColor - string - a color that is used for the icons in the menu and on the map
* type - string - 
* link - URL - an absolute URL or possibly relative path to a webpage with more info about the category
* markerLocations - array - array of Location objects
* polygonLocations - array - array of Area objects
* state - int - whether or not the category is open or not, 1 is open, 0 is closed
* elementID - string - the id of the HTML element for the category, used to reference that element at other times
* globals - object literal - an object with the window and document object in it {win: window, doc: document}
*/
function Category() {
	//constructor and parameters
	//although they are not private they should be accessed through 
	this.id = arguments[0],
	this.name = arguments[1],
	this.title = arguments[2],
	this.text = arguments[3],
	this.iconColor = arguments[4],
	this.link = arguments[5],
	this.markerLocations = [],
	this.polygonLocations = [],
	this.state = 0,
	this.elementID = arguments[7],
	this.globals = arguments[6];
}


//creates an element and builds the html for the element
Category.prototype.buildCatDOM = function() {
	  var element = this.globals.doc.createElement("a");
	  element.className = 'category_bar';
	  element.id = this.elementID;
	  element.setAttribute('href', '#');
      element.innerHTML += '<img class="cat_icon" src="https://www.byui.edu/Prebuilt/maps/imgs/icons/blank-colors/'+ this.iconColor + '.png" />';
      element.innerHTML += '<span class="category_name">' + this.title + '</span>';
      return element;
}


//builds and returns a dom element that contains all of the HTML for a specific category
//including all of the Locations objects and Area objects within that category for the right menu
Category.prototype.getCatDOMObj = function() {
	//the top level wrapper
	var catObj = this.globals.doc.createElement('div');
	catObj.className = 'category';
	catObj.appendChild(this.buildCatDOM());

	//container for the descriptive text about the category and all of it's children
	var catContainer = this.globals.doc.createElement('div');
	catContainer.className = "cat_container";
	catContainer.innerHTML = '<div class="cat_info"><p>' + this.text + '</p><a href="' + this.link + '" target="_blank">' + this.title + ' website</a></div>';

	//a container for all of the Location and Area object's HTML
	var objContainer = this.globals.doc.createElement('div');

	//append each object element and polygon element
	objContainer = this.appendLocations(objContainer);
	objContainer = this.appendAreas(objContainer);

	//append them all togethor and return the catObj DOM object
	catContainer.appendChild(objContainer);
	catObj.appendChild(catContainer);
	return catObj;
}


//gets the html for this category's Location object
//takes one paremeter which is the DOM object that the html needs to go into
Category.prototype.appendLocations = function(container) {
	if (this.markerLocations) {
		for (var i = 0, len = this.markerLocations.length; i < len; i++) {
			container.appendChild(this.markerLocations[i].buildLocationDOM());
		}
	}
	return container;
}


//gets the html for this category's Area object
//takes one parameter which is the DOM object that the html needs to go into
Category.prototype.appendAreas = function(container) {
	if (this.polygonLocations) {
		for (var i = 0, len = this.polygonLocations.length; i < len; i++) {
			container.appendChild(this.polygonLocations[i].buildAreaDOM());
		}
	}
	return container;
}



//bind the click event listener to the category open and close
Category.prototype.bindEventListener = function() {
	var cat = this;
	campusMap.addClickHandler(this.globals.doc.getElementById(this.elementID), function(event) {
		event.preventDefault();
		cat.toggle();
	});
}


//toggles the opening and closing of the category
Category.prototype.toggle = function() {
	var sibling = this.globals.doc.getElementById(this.elementID).parentElement.children[1];
	//close any open info windows
	map.infoWindow.close();
	this.toggleMarkersVisibility();
	if (this.state === 0) {
		this.openCategory(sibling);
	} else {
		this.closeCategory(sibling);
	}
}


//opens the category in the menu
Category.prototype.openCategory = function(sibling) {
	sibling.style.display = "block";
	sibling.style.height = "100%";
	this.state = 1;
}


//closes the category in the menu
Category.prototype.closeCategory = function(sibling) {
	//close the category
	sibling.style.display = "none";
	sibling.style.height = "0";
	this.state = 0;
}


//toggles all of the markers on the map for this category
Category.prototype.toggleMarkersVisibility = function() {
	//if the category is closed
	if (this.state === 0) {
		this.showAllMarkers();
	} else {
		this.hideAllMarkers();
	}
}


//shows all of the markers on the map for this category
Category.prototype.showAllMarkers = function() {
	//only if this category has any Location objects, if this isn't here the FOR loop throws an error
	if (this.markerLocations) {
		for (var i = 0, len = this.markerLocations.length; i < len; i++) {
			if (!this.markerLocations[i].hidden) {
				this.markerLocations[i].marker.setVisible(true);
			}
		}
	}
}


//hides all of the markers on the map for this category
Category.prototype.hideAllMarkers = function() {
	//only if it has any Location objects
	if (this.markerLocations) {
		for (var i = 0, len = this.markerLocations.length; i < len; i++) {
			this.markerLocations[i].showNavigation();
			this.markerLocations[i].hideMarker();
		}
	}
}


//hides all of the polygons on the map for this category
//used when a category closes and there are open polygons for the category
//there isn't a showAllPolygons because when the category opens we do not want to display all of the polygons
Category.prototype.hideAllPolygons = function() {
	if (this.polygonLocations) {
		for (var i = 0, len = this.polygonLocations.length; i < len; i++) {
			this.polygonLocations[i].showNavigation();
			this.polygonLocations[i].hideMapKey();
		}
	}
}


//builds the html for this categorys mapKey
Category.prototype.buildMapKey = function() {
	var html = "";
	if (this.polygonLocations) {
	//build category holder
		html = "<div id='poly_key_" + this.id + "' class='map_key_category map_key_" + this.name + "' style='display: none'><div class='key_title'>" + this.name + " Map Key</div><a class='close icon-cancel nolink' href='#'></a>"; 
		//go through this categories Area objects and build their individual mapKey HTML
		for (var i = 0, len = this.polygonLocations.length; i < len; i++) {
			html += this.polygonLocations[i].buildMapKey();
		}
		html += "</div>";
	}
	return html;
}