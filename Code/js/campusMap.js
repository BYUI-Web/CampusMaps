/*
* Attributes:
* categoryName
* categoryText
* categoryColor
* link
* image
* Locations
* Areas
* foundStyles
*/

function KMLParser() {
	try {
		var xml = new DOMParser().parseFromString(arguments[0], 'text/xml');
		this.doc = xml.childNodes[0].childNodes[1];
	} catch(e) {
		var xml = new ActiveXObject("Microsoft.XMLDOM");
		xml.async = "false";
		xml.loadXML(arguments[0]);
		this.doc = xml.documentElement.firstChild;
	}

	this.Locations = [];
	this.Areas = [];

	this.foundStyles = [];

	this.parseKML();
}


//top level function to parse the KML
KMLParser.prototype.parseKML = function() {
	//get the category folder
	var folder = this.doc.getElementsByTagName("Folder")[0];
	this.categoryName = this.getElementText(folder.getElementsByTagName("name")[0]);
	var description = folder.getElementsByTagName("description")[0];
	var result = this.extractLinkText((description === undefined) ? "" : this.getElementText(description));
	this.categoryText = result[1];
	this.link = result[0];
	result = this.extractSrcFromImage(this.categoryText);
	this.categoryColor = result[0].split("//")[1];
	this.categoryText = result[1];

	result = this.parseAllObjects(folder);

	this.Locations = result[0];
	this.Areas = result[1];
	//we don't need the xml document anymore
	this.doc = null;
};


//this function will parse all of the placemarks according to whether they are a marker or a polygon
KMLParser.prototype.parseAllObjects = function(folder) {
	var folders = folder.getElementsByTagName("Folder");

	var placemarkContainer = [];
	var polygonContainer = [];

	//if there are polygons 
	//we want to do the Folders first because there are Placemark
	//tags in Folders and we don't want them to be mistaken for
	//markers
	folders = this.convertToArray(folders);
	if (folders !== undefined) {
		while (folders.length) {
			var cur = folders.length;
			polygonContainer.push(this.parsePolygon(folders[0]));
			folder.removeChild(folders[0]);
			//if they are still equal then we need to shift the first element
			if (cur === folders.length) {
				folders.shift();
			}
		}
	}


	var placemarks = folder.getElementsByTagName("Placemark");

	//if there are points
	if (placemarks !== undefined) {
		for (var i = 0, len = placemarks.length; i < len; i++) {
			placemarkContainer.push(this.parsePlacemark(placemarks[i]));
		}
	}

	return [placemarkContainer, polygonContainer];
};


//parses all of the polygons
KMLParser.prototype.parsePolygon = function(folder) {
	var polygonFolder = {};
	polygonFolder.name = this.getElementText(folder.getElementsByTagName("name")[0]);
	polygonFolder.code = this.extractCode(this.getElementText(folder.getElementsByTagName("description")[0]))[0];
	polygonFolder.polygons = [];

	var placemarks = folder.getElementsByTagName("Placemark");
	//get all of the individual polygons
	for (var i = 0, len = placemarks.length; i < len; i++) {
		var polygon = placemarks[i];
		var style = this.getColors(this.getElementText(polygon.getElementsByTagName("styleUrl")[0]));
		var description = polygon.getElementsByTagName("description")[0];
		polygonFolder.polygons.push({
			name: this.getElementText(polygon.getElementsByTagName("name")[0]),
			description: (description) ? this.getElementText(description) : "",
			coordinates: this.parseLatLng(this.getElementText(polygon.getElementsByTagName("coordinates")[0])),
			lineColor: style[0],
			polyColor: style[1]
		});
	}

	return polygonFolder;
};


//parses all of the points
KMLParser.prototype.parsePlacemark = function(placemark) {
	var placemarkHolder = {};
	placemarkHolder.name = this.getElementText(placemark.getElementsByTagName("name")[0]);
	var description = placemark.getElementsByTagName("description")[0];
	var result = this.extractLinkText((description) ? this.getElementText(description) : "");
	placemarkHolder.link = result[0];
	placemarkHolder.description = result[1];
	result = this.extractSrcFromImage(placemarkHolder.description);
	placemarkHolder.image = result[0];
	placemarkHolder.description = result[1];
	result = this.extractHours(placemarkHolder.description);
	placemarkHolder.hours = result[0];
	placemarkHolder.description = result[1];
	result = this.extractCode(placemarkHolder.description);
	placemarkHolder.code = result[0];
	placemarkHolder.description = result[1];	
	placemarkHolder.coordinates = this.parseLatLng(this.getElementText(placemark.getElementsByTagName("coordinates")[0]));
	placemarkHolder.icon = this.getIcon(this.getElementText(placemark.getElementsByTagName("styleUrl")[0]));

	return placemarkHolder;
};


//this function will take a string of latitudes and longitudes and parse them into an array of just latitudes and longitudes
//Google Earth outputs the Lat, Lng, and what I'm assuming is altitude but it's always zero so it has to get rid of the zero too
KMLParser.prototype.parseLatLng = function(string) {
	var latlngs = [];
	var strings = string.replace('\n', '').trim().split(' ');
	for (var i = 0, len = strings.length; i < len; i++) {
		var split = strings[i].split(',');
		//put the latitude first and then the longitude
		latlngs.push([split[1], split[0]]);
	}
	return latlngs;
};

//this function will extract the url from the link in any string
KMLParser.prototype.extractLinkText = function(string) {
	var anchor = "";
	if (string !== undefined) {
		var stringAnchorStart = string.indexOf("<a");
		if (stringAnchorStart !== -1) {
			var stringAnchorEnd = string.indexOf("</a>") + 4;
			anchor = string.substr(stringAnchorStart, stringAnchorEnd - stringAnchorStart);
			endAnchorPos = anchor.indexOf('>') + 1;
			anchor = anchor.substr(endAnchorPos, anchor.length - 4 - endAnchorPos);
			string = string.substr(0, stringAnchorStart) + string.substr(stringAnchorEnd);
		}
	}

	return [anchor, string];
};


//this function will extract the src from the image in any string
KMLParser.prototype.extractSrcFromImage = function(string) {
	var image = "";
	if (string !== undefined) {
		var stringImageStart = string.indexOf("<img");
		if (stringImageStart !== -1) {
			var stringImageEnd = string.indexOf("/>") + 2;
			image = string.substr(stringImageStart, stringImageEnd - stringImageStart);
			srcStartPos = image.indexOf('src=') + 5;
			image = image.substr(srcStartPos, image.length - srcStartPos - 3);
			string = string.substr(0, stringImageStart) + string.substr(stringImageEnd);
		}
	}

	return [image, string];
};


//this function wll extract the hours from the string
KMLParser.prototype.extractHours = function(string) {
	var hours = "";
	if (string !== undefined) {
		var hoursStartTag = string.indexOf("<hours>");
		if (hoursStartTag !== -1) {
			var hoursEndTag = string.indexOf("</hours>");
			hours = string.substr(hoursStartTag + 7, hoursEndTag - (hoursStartTag + 7));
			string = string.substr(0, hoursStartTag) + string.substr(hoursEndTag + 8);
		}
	}

	return [hours, string];
};

//this function wll extract the hours from the string
KMLParser.prototype.extractCode = function(string) {
	var code = "";
	if (string !== undefined) {
		var codeStartTag = string.indexOf("<code>");
		if (codeStartTag !== -1) {
			var codeEndTag = string.indexOf("</code>");
			code = string.substr(codeStartTag + 6, codeEndTag - (codeStartTag + 6));
			string = string.substr(0, codeStartTag) + string.substr(codeEndTag + 7);
		}
	}

	return [code, string];
};


//these functions below are for getting the icon styles
KMLParser.prototype.getIcon = function(id) {
	var icon = "";
	if (this.foundStyles[id]) {
		icon = this.foundStyles[id];
	} else {
		var styleMap = this.getElement(id.substr(1), "StyleMap");
		var styleUrl = this.getElementText(styleMap.getElementsByTagName("styleUrl")[0]).substr(1);
		var style = this.getElement(styleUrl, "Style");
		icon = this.getElementText(style.getElementsByTagName("href")[0]);
		this.foundStyles[id] = icon;
	}
	return icon;
};

KMLParser.prototype.getColors = function(id) {
	var lineColor = "";
	var polyColor = "";
	var style = [];
	if (this.foundStyles[id]) {
		style = this.foundStyles[id];
	} else {
		var styleMap = this.getElement(id.substr(1), "StyleMap");
		var styleUrl = this.getElementText(styleMap.getElementsByTagName("styleUrl")[0]).substr(1);
		var styles = this.getElement(styleUrl, "Style");
		var line = styles.getElementsByTagName("LineStyle")[0];
		if (line) {
			lineColor = this.getElementText(line.getElementsByTagName("color")[0]).substr(2);
		} else {
			lineColor = "FFFFF";
		}
		var poly = styles.getElementsByTagName("PolyStyle")[0];
		if (poly) {
			polyColor = this.getElementText(poly.getElementsByTagName("color")[0]).substr(2);
		} else {
			polyColor = "FFFFF";
		}
		style = ['#' + lineColor, '#' + polyColor];
		this.foundStyles[id] = style;
	}
	return style;
};

KMLParser.prototype.getElementText = function(element) {
	return (element.textContent === undefined) ? element.text : element.textContent;
};

KMLParser.prototype.getElement = function(id, tag) {
	var element = null;

	try {
		element = this.doc.querySelector('[id="' + id + '"]');
		if (element === null) {
			element = this.getElementByTagName(id, tag);
		}
	} catch(e) {
		element = this.getElementByTagName(id, tag);
	}
	return element;
};


KMLParser.prototype.getElementByTagName = function (id, tag) {
	var element = null;
	//loop through all of the elements and try to find the one with the right id
		var elements = this.doc.getElementsByTagName(tag);
		for (var i = 0, len = elements.length; i < len && element === null; i++) {
			if (elements[i].getAttribute("id") === id) {
				element = elements[i];
			}
		}
		return element;
};

KMLParser.prototype.convertToArray = function(collection) {
	var array = [];
	for (var i = 0, len = collection.length; i < len; i++) {
		array[i] = collection[i];
	}
	return array;
};
/*************************************************************************
* the area class definition for use for polygons
*
* Parameters:
* name - string - the name of the polygon for use in the right menu
* code - string - the unique code for use in referencing this object
* contains - string - descriptive text for the polygon, used in the info window when someone clicks on the rendered
*                       polygon on the map
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
	this.name = arguments[0];
	this.code = arguments[1];
	this.info = arguments[2];
	this.lineColor = arguments[3][0].lineColor;
	this.fillColor = arguments[3][0].polyColor;
	this.polygons = this.createPolygons(arguments[3]);
	this.numberOfPolygons = this.polygons.length;
	this.elementID = this.code + "_poly";
	this.globals = arguments[4];
	this.state = 0;
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
};


//builds this object's MapKey html
Area.prototype.buildMapKey = function () {
	return '<div class="polygon_key" id="poly_key_' + this.code + '" style="border-color:' + this.borderColor + '; background-color:' + this.fillColor + '">' + this.code + '</div>';
};


//binds the event listener for the HTML element in the right menu that represents this object
Area.prototype.bindEventListener = function() {
	var area = this;
	campusMap.addClickHandler(this.globals.doc.getElementById(this.elementID), function(event) {
		event.preventDefault();
		area.globals.win.location.hash = area.code;
		area.togglePolygon();
	});
};


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
};


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
};


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
};


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
};


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
	});
};


//hides both the polygon on the map(and mapkey) and in the right navigation
Area.prototype.hideAll = function() {
	if (campusMap.includeMenus) {
		this.hideMapKey();
		this.hideNavigation();
	}
};


//hides the HTML representing this object in the MapKey
Area.prototype.hideMapKey = function() {
		//get the span for this polygon
	var span = (campusMap.includeMenus) ? this.globals.doc.getElementById(this.elementID).children[0].children[0] : undefined;
	var polyKey = (campusMap.includeMenus) ? this.globals.doc.getElementById("poly_key_" + this.code) : undefined;
		//make sure that it is not checked and therefore not showing up in the map
	this.hidePolygons(span, polyKey);
};

//hides the HTML element that represents this object in the navigation
Area.prototype.hideNavigation = function() {
	this.hidden = true;
	//hide it in the left navigation
	this.globals.doc.getElementById(this.elementID).style.display = "none";
};


//shows both the polygon on the map(and mapkey) and in the right navigation
Area.prototype.showAll = function() {
	if (campusMap.includeMenus) {
		this.showMapKey();
		this.showNavigation();
	}
};

//shows the HTML representing this object in the MapKey
Area.prototype.showMapKey = function() {
	//show in mapkey
	var span = (campusMap.includeMenus) ? this.globals.doc.getElementById(this.elementID).children[0].children[0] : undefined;
	var polyKey = (campusMap.includeMenus) ? this.globals.doc.getElementById("poly_key_" + this.code) : undefined;
	this.showPolygons(span, polyKey);
};


//shows the HTML element that represents this object in the navigation
Area.prototype.showNavigation = function() {
	this.hidden = false;
	this.globals.doc.getElementById(this.elementID).style.display = "block";
};

//attaches all of the events onto each polygon when it is loaded on the google map
Area.prototype.attachInfoWindowEvents = function() {
	for (var i = 0; i < this.numberOfPolygons; i++) {
		map.createPolygonInfoWindow(this.polygons[i], this);
	}
};
/***************************************************************************************************
 * this class is the definition for the campusMap class
 * the object created from this class has all of the necessary code in order to create a campus map
 *
 * This object takes an options object literal to define all of the options for the campus map
 *
 * this class has several attributes as follows
 * element - string - the id of the html element you wish to place the maps into
 * menuState - bool - the state of the right menu, 0 is closed and 1 is open
 * includeMenus - bool - a bool that determines if the header and menus will be included in the page
 * KMLFiles - array - an array of strings that specify where the KML files you wish to load are located
 * device - int - stores the current device type, was initially used to keep track of the whether the user
 *              was on a mobile device or a desktop to alter styling but is no longer necessary because
 *              all of the styling between different devices is handles in the CSS with media queries
 * categories - array - will hold all of the categories for the map
 * globals - object - an object literal that contains a local reference to the window object and the document object
 *                  for use in any methods as well as passing to other objects upon initialization when they need
 *                  a local version
 *
 * As you can see in the code when the object is created it takes into account the options object passed to it
 * to define all of it's attributes.  There are default values for most of the attributes except for
 * element (I have considered making the default id 'map' so that the user doesn't have to specify they just
 * have to have an element on the page with an id of 'map')
 *
 * menuState - 1 (open)
 * includeMenus - true (include)
 * device - 0
 * globals - {doc: document, win: window}
 *
 * Method descriptions will be included above each method
 */
function CampusMap(options) {
    this.element = (options.element) ? options.element : console.log("No element provided."),
    this.menuState = (options.menuState) ? options.menuState : 1,
    this.includeMenus = (options.includeMenus) ? options.includeMenus : true,
    this.KMLFiles = (options.categories) ? options.categories : console.log("No KML Files specified"),
    this.device = 0,
    this.categories = [];

    //other often used variables that should be passed around to be used in any other class
    this.globals = {
        doc: document,
        win: window
    }
    //if we want to include the menus then we need to include the css file
    addCSS("css/map.css", this.globals);
    //When the campusMap object is created it does not create the map or load anything yet.  It must first load the maps
    //api.  In the src for the maps api you can define a callback function to be run when the maps api loads which is what
    //we are doing here to call the campusMap objects initializeMaps method
    addScript("https://maps.googleapis.com/maps/api/js?v=3&sensor=false&callback=campusMap.initializeMaps", this.globals);
}


/**********************************************************
 * initializeMaps - calls the initialization stack
 */
CampusMap.prototype.initializeMaps = function () {
    //if it is being embeded, add an embed class to the element
    if (map.embedOptions.embed) {
        var element = this.globals.doc.getElementById(this.element)
        element.className += " embed";
    }
    //builds the mark up based on the options sent in
    this.buildHTML();
    //initiate the google map
    map.initiateMap(this.globals);
    //detect what kind of device the user is on
    this.detectDevice();

    this.loadKMLFiles();
    this.bindAllEvents();

    //bind the menuButton event only if they want to include menus
    if (this.includeMenus) {
        if (this.device === 0) {
            this.hideMenu();
        }
        this.bindMenuButton();
    }

    this.handleResize();

    //this event runs after all of the tiles are loaded in the actual map
    //some functions need to wait until this is done in order to run or else they lock up the 
    //dom and prevent the map from loading
    google.maps.event.addListenerOnce(map.map, 'tilesloaded', function () {
        //set the height of the element that the map will be contained in so that the mapKey will 
        //not be lower then the bottom of the window
        campusMap.setMapHeight();
        //if they want to include the menus then we should build the mapkey and initialize the
        //search
        if (campusMap.includeMenus) {
            campusMap.buildMapKey();
            campusMap.initializeSearch();
        }
        //places a marker if the embed options have been set
        if (map.embedOptions.embed === false) {
            //if not then we know that they may be on the full maps experience and we should look for 
            //whether a building has been passed to show on the map when it has loaded
            campusMap.anchorLocation();
        } else if (!campusMap.includeMenus) {
            //display everything
            campusMap.displayAll();
        }

        //after everything is loaded lets put a marker showing where you are
        campusMap.getLocation();
    });
};


//builds the needed HTML for the map
CampusMap.prototype.buildHTML = function () {
    //only include the header if they want it
    var html = (this.includeMenus) ? '<div id="title"><h1 id="heading">BYU-Idaho Campus Map</h1><a style="display: none;" id="device_type" href="#" onmousedown="toggleDevice(); return false;" title="Switch Device Type"><div id="device_container"><div class="device icon-desktop"></div><div class="device icon-mobile"></div></div></a><a id="menu_button" class="icon-settings" href="#" title="Open Menu. Click this or press [space] bar"></a></div>' : "";
    html += '<div id="container" name="container">';
    //only include the menu if they want it
    html += (this.includeMenus) ? '<div id="menu" name="menu" style="display:block; z-index: 2;"><div id="inner_menu" class="scrolling-element-class" ><div id="object_search"><div class="search-wrapper"><input type="text" placeholder="Search"/><span class="icon-cancel"></span></div></div><nav id="categories" class="child-element"></nav><!-- // categories --><div id="floor-plans-notification"><p>Floor plans of each building are available on <a href="https://www.google.com/maps/place/Brigham+Young+University+Idaho/@43.814113,-111.783878,17z/data=!4m2!3m1!1s0x53540b03dc48a5cf:0x1e5534d3c38ef412" target="_blank">Google Maps</a></p></div></div><!-- // inner menu --><div id="notification" class="hybrid"><a id="info" title="[Coming Soon] More info about this map" class="icon-info" href="#"></a><a id="feedback" title="Submit feedback about this map" class="icon-feedback" target="_blank" href="http://www.byui.edu/feedback/maps"></a></div></div><!-- // menu -->' : "";
    html += '<div id="map_canvas"><div id="nojs-msg"><br/>This BYU-Idaho Campus Map application requires Javascript to run. <br/>Your device or browser doesn\'t appear to have JavaScript enabled. <br/>Please enable it and try again, or try another device or browser.</div></div>';
    html += '<div id="map_keys"></div>';
    //place the html into the dom where they have specified it to be located
    this.globals.doc.getElementById(this.element).innerHTML = html;
};


//asynchronasly loads the category/objects file and then parses it
CampusMap.prototype.loadKMLFiles = function (callback) {
    //make local copies of these attributes so they can be used within this closure
    //you can't use this in the onreadystatechange function because it will refer to 
    //that function's attributes and not the CampusMap attributes
    var parent = this;

    //get any stored information from localStorage
    var json = (localStorage) ? localStorage.mapData : undefined;
    var mapData = (json) ? JSON.parse(json) : {};

    Promise.all(this.loadKMLFiles.map(this.loadKMLFile)).then(function (responses) {
        responses.forEach(function(response) {
        var data = new KMLParser(response);
        mapData[index] = data;
        parent.buildCategories(data);
    });


    //loop through all of the given KML files and load them
//    for (var i = 0, len = this.KMLFiles.length; i < len; i++) {
//        var filePath = this.KMLFiles[i];
//        var split = filePath.split(".");
//        var index = split[split.length - 2];
//        //
//        //        if (mapData[index]) {
//        //            this.buildCategories(mapData[index]);
//        //        } else {
//        //create the xmlhttp object
//
//    }
//    //    }

    //once everything is done we will save the information to local storage
//    localStorage.mapData = JSON.stringify(mapData);
};

CampusMap.prototype.loadKMLFile = function (filepath) {
    return new Promise(function (resolve, reject) {
        var xmlhttp;
        if (window.XMLHttpRequest) { // code for IE7+, Firefox, Chrome, Opera, Safari
            xmlhttp = new XMLHttpRequest();
        } else { // code for IE6, IE5
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }
        xmlhttp.onreadystatechange = function () {
            //after everything is loaded...
            if (xmlhttp.readyState == 4) {
                //parse the JSON and pass the data to the parseCategories function
                //after parsing the JSON it will just create a bunch of object literals and thus won't have any methods or extra attributes
                //attached to them until we create them for each object which is redundant.  So a category, location, and area classes have
                //been created that match the structure of their respective objects loaded from the JSON.
                resolve(xmlhttp.responseText);
            }
        }
        //cannot be asynchronous or else it will not load them all
        xmlhttp.open("GET", filePath);
        xmlhttp.send();
    });
}


//creates category objects from the category data
CampusMap.prototype.buildCategories = function (data) {
    var index = this.categories.length;

    //create a new category for this KML File
    this.categories[index] = new Category(index + 1, data.categoryName, data.categoryName, data.categoryText, data.categoryColor, data.link, this.globals, "cat_" + (index + 1));
    this.categories[index].markerLocations = this.parseLocations(data.Locations, "http://www.byui.edu/Prebuilt/maps/imgs/icons/numeral-icons/" + data.categoryColor + "/");
    this.categories[index].polygonLocations = this.parseAreas(data.Areas);

    //only do it if we need to inlude the menus
    if (this.includeMenus) {
        var element = this.globals.doc.getElementById("categories")
        var DOM = this.categories[index].getCatDOMObj();
        element.appendChild(DOM);
    }
};


//parses all of the locations and creates location objects out of them all
//receives two parameters
//locations - an array of a categories markers/locations to parse
//color - the color of the category so the marker knows what color it needs to make it's icons
CampusMap.prototype.parseLocations = function (locations, color) {
    //an array for holding all of the new Location objects
    var markerLocations = [];
    for (var j = 0, numberLocations = locations.length; j < numberLocations; j++) {
        //create a new Location object and push it onto the markerLocations array
        var marker = locations[j]
        markerLocations.push(new Location(marker.name, marker.code, marker.coordinates[0][0], marker.coordinates[0][1], marker.image, marker.hours, marker.description, marker.link, j, this.globals, (this.includeMenus) ? color + (j + 1) + ".png" : marker.icon));
    }
    //send back the array of the Location objects for the category to hold
    return markerLocations;
};


//parses all of the areas and creates area objects out of them all
//all of the logic is the same as the parseLocations method so one can refer to that method for 
//more information about how this method is functioning
CampusMap.prototype.parseAreas = function (areas) {
    var polygonAreas = [];
    for (var j = 0, numberAreas = areas.length; j < numberAreas; j++) {
        var polygon = areas[j]
        polygonAreas.push(new Area(polygon.name, polygon.code, polygon.description, polygon.polygons, this.globals));

    }
    return polygonAreas;
};


//detects what kind of device is being 
CampusMap.prototype.detectDevice = function () {
    var width = this.globals.doc.getElementById(this.element).offsetWidth;
    //it was determined that anything less than 800 pixels would be considered a mobile device
    this.device = (width < 800) ? 0 : 1;
};


//binds all of the events for each category the CampusMap object has and their subsequent Location and Area objects
CampusMap.prototype.bindAllEvents = function () {
    var category;
    //loop through each category
    for (var i = 0, len = this.categories.length; i < len; i++) {
        category = this.categories[i];
        //only if they included the menus
        if (this.includeMenus) {
            //bind the categories event listener
            category.bindEventListener();
            //for each marker and each polygon we will bind their events
            if (category.markerLocations) {
                for (var j = 0, len2 = category.markerLocations.length; j < len2; j++) {
                    category.markerLocations[j].bindEventListener();
                }
            }
            if (category.polygonLocations) {
                for (var j = 0, len2 = category.polygonLocations.length; j < len2; j++) {
                    category.polygonLocations[j].bindEventListener();
                }
            }
        }
    }
};


//builds the mapKey element so that it contains all the key for each polygon in each category
CampusMap.prototype.buildMapKey = function () {
    var html = "";
    //creates a mapKey for each category
    for (var i = 0, len = this.categories.length; i < len; i++) {
        html += this.categories[i].buildMapKey();
    }
    //append the html to the map_keys element
    //do it all at once so we are minimizing the amount of DOM manipulation we are doing
    this.globals.doc.getElementById("map_keys").innerHTML = html;
    //attach events to close it
    for (var i = 0, len = this.categories.length; i < len; i++) {
        this.addClickHandler(this.globals.doc.getElementById("poly_key_" + (i + 1)).getElementsByTagName("a")[0], function () {
            this.parentElement.style.display = "none";
        })
    }
};


//gets the height of the element that the map is being embedded into
CampusMap.prototype.getMapHeight = function () {
    var height = this.globals.doc.getElementById(this.element).offsetHeight;
    return (this.includeMenus) ? height - 57 : height;
};


//sets the height of the elements the CampusMap object creates to hold the map
//so that it can fill the element it is being embedded into
CampusMap.prototype.setMapHeight = function () {
    var height = this.getMapHeight();
    var container = this.globals.doc.getElementById('container');
    container.style.height = height + "px";
    var map_canvas = this.globals.doc.getElementById('map_canvas');
    map_canvas.style.height = height + "px";
};


//initializes the search functionality mainly by binding the events to the 
//proper elements
CampusMap.prototype.initializeSearch = function () {
    var search = this.globals.doc.getElementById('object_search').children[0].children[0];
    //binds keyup so that it will have a live search
    //it will send the value of the search field on each key up
    //the searching is fast enough to handle this although polygons can be
    //a little laggy in rendering
    this.addKeyUpListener(search, function () {
        campusMap.performSearch(search.value);
    });

    //make the close button on the search clear the field and then perform the search with no value
    //in order to clear everything
    this.addClickHandler(search.nextSibling, function () {
        search.value = "";
        campusMap.performSearch("");
    });

};


//performs the search looking in each Location and Area object to see if any of their names match the provided search
//criteria
CampusMap.prototype.performSearch = function (val) {
    //only perform the search if something was sent
    if (val != "") {
        //we lowercase the criteria just to make sure that their won't be any case sensitive problems
        val = val.toLowerCase();
        //loop through each category and then through each Location and Area to find matches
        for (var i = 0, len = this.categories.length; i < len; i++) {
            var cat = this.categories[i];
            //figures out how many options there are possible to be visible so the total number of Location objects and Area objects there are
            //in order to know how many have been hidden so that if there are no more visible ones it will close the category to free up space 
            //in the menu
            var visibleOptions = ((cat.markerLocations) ? cat.markerLocations.length : 0) + ((cat.polygonLocations) ? cat.polygonLocations.length : 0);
            //if there are any Location objects then search them
            if (cat.markerLocations) {
                for (var j = 0, len2 = cat.markerLocations.length; j < len2; j++) {
                    //if it doesn't match then hide the marker and element in the right
                    //menu and decrease the number of visible options
                    if (cat.markerLocations[j].name.toLowerCase().indexOf(val) === -1) {
                        cat.markerLocations[j].hideAll();
                        visibleOptions--;
                    }
                    //if it does match then make sure it is visible
                    else {
                        cat.markerLocations[j].showAll();
                    }
                }
            }
            //same logic as the Location object search
            if (cat.polygonLocations) {
                for (var j = 0, len2 = cat.polygonLocations.length; j < len2; j++) {
                    if (cat.polygonLocations[j].name.toLowerCase().indexOf(val) === -1) {
                        cat.polygonLocations[j].hideAll();
                        visibleOptions--;
                    } else {
                        cat.polygonLocations[j].showAll();
                    }
                }
            }
            //this element is the container of the category objects
            var sibling = this.globals.doc.getElementById(cat.elementID).parentElement.children[1];
            //if there are no more options available then close the category but if there are some
            //make sure that it's still open
            if (visibleOptions > 0) {
                cat.openCategory(sibling);
            } else {
                cat.closeCategory(sibling);
            }
        }
    }
    //if nothing was sent then we will put the maps back to it's original state
    else {
        //loop through each category and hide all the markers and polygons from the map
        for (var i = 0, len = this.categories.length; i < len; i++) {
            var cat = this.categories[i];
            if (cat.markerLocations) {
                this.categories[i].hideAllMarkers();
            }
            if (cat.polygonLocations) {
                this.categories[i].hideAllPolygons();
            }
            //close that category
            var sibling = this.globals.doc.getElementById(cat.elementID).parentElement.children[1];
            cat.closeCategory(sibling);
        }
    }
};


//attaches the event listener to the menu button to open and close it
CampusMap.prototype.bindMenuButton = function () {
    this.addClickHandler(this.globals.doc.getElementById('menu_button'), function () {
        //uses the campusMap object to toggle the menu since the this keyword will refer
        //to the current anonymous function
        campusMap.toggleMenu();
    });
};


//toggle the menu depending on it's current state
CampusMap.prototype.toggleMenu = function () {
    (this.menuState) ? this.hideMenu() : this.showMenu();
};


//hide the menu
CampusMap.prototype.hideMenu = function () {
    this.menuState = 0;
    var menu = this.globals.doc.getElementById('menu');
    if (this.device === 1) {
        this.updateTransform(menu, 300, 0);
    } else {
        var width = this.globals.doc.getElementById(this.element).offsetWidth;
        this.updateTransform(menu, width, 0);
    }
};


//show the menu
CampusMap.prototype.showMenu = function () {
    this.menuState = 1;
    this.updateTransform(this.globals.doc.getElementById('menu'), 0, 0);
};


//displays a certain location depending on if a code has been sent in the hash of the url
CampusMap.prototype.anchorLocation = function () {
    //detect if a code has been sent in the url using an anchor
    if (window.location.hash) {
        var code = window.location.hash.substr(1);
        //find the object it is referring to
        var object = this.findObject(code);
        //since the Location and Area objects both have a showAll method that does the same thing we can call it without
        //worrying what type of object it is
        object.showAll();
        //only fire the event if it is a marker
        if (object.polygons === undefined) {
            //fire the click event on the element in the menu to open the info window for the 
            this.fireEvent(this.globals.doc.getElementById(object.elementID), 'click');
        }
    }
};


//finds an object from it's code
CampusMap.prototype.findObject = function (code) {
    var object = null;
    //loop through each category and it's subsequent Location and Area objects until it finds a match
    for (var i = 0, len = this.categories.length; i < len && object === null; i++) {
        var cat = this.categories[i];
        if (cat.markerLocations) {
            for (var j = 0, len2 = cat.markerLocations.length; j < len2 && object === null; j++) {
                if (cat.markerLocations[j].code === code) {
                    object = cat.markerLocations[j];
                }
            }
        }
        if (cat.polygonLocations) {
            for (var j = 0, len2 = cat.polygonLocations.length; j < len2 && object === null; j++) {
                if (cat.polygonLocations[j].code === code) {
                    object = cat.polygonLocations[j];
                }
            }
        }
    }
    return object;
};


//this function will display everything.  Used when an object it is embeded and there are
//no menus
CampusMap.prototype.displayAll = function () {
    //loop through each category and it's subsequent Location and Area objects until it finds a match
    for (var i = 0, len = this.categories.length; i < len; i++) {
        var cat = this.categories[i];
        if (cat.markerLocations) {
            for (var j = 0, len2 = cat.markerLocations.length; j < len2; j++) {
                cat.markerLocations[j].showAll();
            }
        }
        if (cat.polygonLocations) {
            for (var j = 0, len2 = cat.polygonLocations.length; j < len2; j++) {
                cat.polygonLocations[j].showPolygons();
            }
        }
    }
};

//crossbrowser solution to triggering an event on an element
CampusMap.prototype.fireEvent = function (element, event) {
    if (document.createEvent) {
        // dispatch for firefox + others
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent(event, true, true); // event type,bubbling,cancelable
        return !element.dispatchEvent(evt);
    } else {
        // dispatch for IE
        var evt = document.createEventObject();
        return element.fireEvent('on' + event, evt)
    }
};


//crossbrowser solution for adding click events
CampusMap.prototype.addClickHandler = function (element, callback) {
    try {
        element.addEventListener('click', callback);
    } catch (e) {
        element.attachEvent("onclick", callback);
    }
};

CampusMap.prototype.addKeyUpListener = function (element, callback) {
    try {
        element.addEventListener('keyup', callback);
    } catch (e) {
        element.attachEvent("onkeyup", callback);
    }
};

//this function will test for geolocation support and then prompt the user for their location
CampusMap.prototype.getLocation = function () {
    if (navigator.geolocation && this.device === 0) {
        navigator.geolocation.getCurrentPosition(this.showPosition);
    }
};

//this function will show the users position on the map
CampusMap.prototype.showPosition = function (position) {
    var marker = map.createMarker(position.coords.latitude, position.coords.longitude, "You are here", "imgs/icons/youarehere.png");
    marker.setVisible(true);
};

CampusMap.prototype.handleResize = function () {
    this.globals.win.addEventListener('resize', function () {
        campusMap.detectDevice();

        //handle the menu if it has been closed
        if (campusMap.menuState === 0) {
            var menu = campusMap.globals.doc.getElementById('menu');
            if (campusMap.device === 1) {
                campusMap.updateTransform(menu, 300, 0);
            } else {
                menu.setAttribute('class', menu.getAttribute('class') + " no-animate");
                var width = campusMap.globals.doc.getElementById(campusMap.element).offsetWidth;
                campusMap.updateTransform(menu, width, 0);
                menu.offsetHeight;
                menu.setAttribute('class', menu.getAttribute('class').replace(" no-animate", ""));
            }
        }

        campusMap.setMapHeight();
    });
};

CampusMap.prototype.updateTransform = function (element, x, y) {
    element.style.webkitTransform = "translate(" + x + "px," + y + "px)";
    element.style.mozTransform = "translate(" + x + "px," + y + "px)";
    element.style.transform = "translate(" + x + "px," + y + "px)"
};
//adds the script for the addthis social sharing api
addScript("https://s7.addthis.com/js/300/addthis_widget.js#pubid=xa-51f6872a25a1fb8c", { win: window, doc: document });
//addScript("https://www.byui.edu/Prebuilt/maps/js/vendor/modernizr-2.6.1.min.js", {doc: document});
//both of the constructors takes a global options object literal containing all of the options the user
//wishes to set for the campus map
//it is optional for the Map constructor but not for the CampusMap object as you need to specify the id of the element
//it will be embedded in
var campusMap = new CampusMap(options);
var map = new Map(options);

/***************************************************
* this function is used to add a script to the page
* takes two parameters
* src - the relative or absolute url of the script to be embeded
* local - an object literal containing the document element
*			{ doc : document}
****************************************************/
function addScript(src, local) {
	var script = local.doc.createElement("script");
	script.type = "text/javascript";
	script.src = src;
	local.doc.getElementsByTagName("body")[0].appendChild(script);
}
function addCSS(src, local) {
	var link = local.doc.createElement("link");
	link.setAttribute("rel", "stylesheet");
	link.href = src;
	local.doc.getElementsByTagName("body")[0].appendChild(link);
}
if(typeof String.prototype.trim !== 'function') {
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, ''); 
  }
}
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
};


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
};


//gets the html for this category's Location object
//takes one paremeter which is the DOM object that the html needs to go into
Category.prototype.appendLocations = function(container) {
	if (this.markerLocations) {
		for (var i = 0, len = this.markerLocations.length; i < len; i++) {
			container.appendChild(this.markerLocations[i].buildLocationDOM());
		}
	}
	return container;
};


//gets the html for this category's Area object
//takes one parameter which is the DOM object that the html needs to go into
Category.prototype.appendAreas = function(container) {
	if (this.polygonLocations) {
		for (var i = 0, len = this.polygonLocations.length; i < len; i++) {
			container.appendChild(this.polygonLocations[i].buildAreaDOM());
		}
	}
	return container;
};



//bind the click event listener to the category open and close
Category.prototype.bindEventListener = function() {
	var cat = this;
	campusMap.addClickHandler(this.globals.doc.getElementById(this.elementID), function(event) {
		event.preventDefault();
		cat.toggle();
	});
};


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
};


//opens the category in the menu
Category.prototype.openCategory = function(sibling) {
	sibling.style.display = "block";
	sibling.style.height = "100%";
	this.state = 1;
};


//closes the category in the menu
Category.prototype.closeCategory = function(sibling) {
	//close the category
	sibling.style.display = "none";
	sibling.style.height = "0";
	this.state = 0;
};


//toggles all of the markers on the map for this category
Category.prototype.toggleMarkersVisibility = function() {
	//if the category is closed
	if (this.state === 0) {
		this.showAllMarkers();
	} else {
		this.hideAllMarkers();
	}
};


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
};


//hides all of the markers on the map for this category
Category.prototype.hideAllMarkers = function() {
	//only if it has any Location objects
	if (this.markerLocations) {
		for (var i = 0, len = this.markerLocations.length; i < len; i++) {
			this.markerLocations[i].showNavigation();
			this.markerLocations[i].hideMarker();
		}
	}
};


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
};


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
};
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
};


//binds the event listener to the HTML element that represents this object in the right menu
//to open it on the map
Location.prototype.bindEventListener = function() {
	var marker = this;
	campusMap.addClickHandler(this.globals.doc.getElementById(this.elementID),function(event) {
		event.preventDefault();
		marker.globals.win.location.hash = marker.code;
		marker.panToMarker();
        if (campusMap.device == 0) {
            campusMap.hideMenu();
        }
	});
};


//pans to the marker in the google map
Location.prototype.panToMarker = function() {
	var moveEnd = google.maps.event.addListener(map, 'moveend', function() {
    var markerOffset = map.map.fromLatLngToDivPixel(this.marker.getPosition());
      google.maps.event.removeListener(moveEnd);
    });
    map.map.panTo(this.marker.getPosition());
    google.maps.event.trigger(this.marker, 'click');
};


//creates a google maps marker for this object
Location.prototype.createMarker = function() {
	this.marker = map.createMarker(this.lat, this.lon, this.name, this.icon)
};


//create the info window for this object
Location.prototype.createInfoWindow = function() {
	map.createInfoWindow(this.marker, this);
};


//hides the marker on the map and in the menu
Location.prototype.hideAll = function() {
	this.hideNavigation();
	if (campusMap.includeMenus) {
		this.hideMarker();
	}
};


//hides the marker on the map for this object
Location.prototype.hideMarker = function() {
	this.marker.setVisible(false);
};


//hides the HTML element in the right menu that represents this object
Location.prototype.hideNavigation = function() {
	this.hidden = true;
	//hide it in the navigation and then hide it on the map
	this.globals.doc.getElementById(this.elementID).style.display = "none";
};


//shows the marker on the map and the element in the menu
Location.prototype.showAll = function() {
	this.showMarker();
	if (campusMap.includeMenus) {
		this.showNavigation();
	}
};


//shows the marker on the map
Location.prototype.showMarker = function() {
	this.marker.setVisible(true);
};


//shows the HTML element in the menu
Location.prototype.showNavigation = function() {
	this.hidden = false;
	this.globals.doc.getElementById(this.elementID).style.display = "block";
};

/**********************************************************************************
* this class definition is for the maps, any interaction with the google maps should go through here
* there are some places where it doesn't go through here and that will have to be changed later
*
* The Map object also takes an options object literal to determine it's attributes and for the
* google map
*
* the Map object has several attributes
* map - google map - holds a reference to the google map which is used in many differenct methods used by the maps api
* mapOptions - object literal - it's contents are as follows
*                             - campusOverlayVisible - bool - lets you determine if the campusOverlay should show up on the map
*                             - campusFile - string - absolute path to the campusFile, must be absolute because it will be sent to google
*                             - centerCoordinates - array - the latitude and longitude the map will center on
* embedOptions - object literal - it's contents are as follows
*                               - embed - bool - whether it should be embed or not
*                               - coordinates - array - array of the latitude and longitude that the embedded map will center on 
*                               - zoom - int - the level of zoom for the embedded map
*                               - mapView - string - the view you wish to use in the embed "map" or "satellite" (satellite does hybrid view but most people know it as satellite)
* googleMapOptions - object literal - contains other options for google maps set at a later point
* infoWindow - object - a single infoWindow used by each marker
* campusLayer - object - a layer object created by the maps api of the campus
*
* Most of these attributes can be set in the options and therefore those attributes have default values as follows
* campusOverlayVisible - true
* embed - false
* coordinates - (same as centerCoordinates)
* name - ""
* icon - "blue"
* zoom - 16
* mapView - "satellite"
*
* method descriptions will be with their respective method declaration
*/
function Map(options) {
  this.map;
  this.mapOptions = {
    campusOverlayVisible : (options['campusOverlay'] == null) ? true : options['campusOverlay'],
    campusFile : 'http://www.byui.edu/Prebuilt/maps/campus_outline.xml',
    coordinates : (options['centerCoordinates'] !== undefined) ? options['centerCoordinates'] : [43.815045,-111.783515]
  },
  this.embedOptions = {
    embed : (options['embed'] === undefined) ? false : options['embed'],
    zoom: (options['zoom']) ? options['zoom'] : 16,
    mapView: (options['mapView']) ? options['mapView'] : "map"
  }
  this.googleMapOptions = {},
  this.infoWindow,
  this.campusLayer;
}


//initiates the map stack to get the maps showing up
//takes one parameter
//local - object literal - contains the window and document objects {win: window, doc: document}
Map.prototype.initiateMap = function(local) {
    this.setGoogleMapOptions();
    this.setGoogleMap(local);
    this.setInfoWindow();
    this.setCampusLayer();
  };


//sets the options used by google maps for displaying a map
Map.prototype.setGoogleMapOptions = function() {
  //determine which view will be used based on the embedOptions
  if (this.embedOptions.mapView === "map") {
    var view = google.maps.MapTypeId.ROADMAP;
  } else {
    var view = google.maps.MapTypeId.HYBRID;
  }

  //set the options
  this.googleMapOptions = {
    zoom: (this.embedOptions.embed) ? this.embedOptions.zoom : 16,
    center: new google.maps.LatLng(this.mapOptions.coordinates[0], this.mapOptions.coordinates[1]),
    mapTypeId: view,
    mapTypeControlOptions: {
      mapTypeIds: [google.maps.MapTypeId.ROADMAP,
             google.maps.MapTypeId.SATELLITE,
             google.maps.MapTypeId.HYBRID,
             google.maps.MapTypeId.TERRAIN]
    }
  };
};


//creates the google map
Map.prototype.setGoogleMap = function(local) {
  //add the prototype to find the center of a polygon for google maps
    google.maps.Polygon.prototype.getCenter=function(){
      var paths = this.getPaths().getArray()[0].b;
      var latMin = paths[0].mb,
          lonMin = paths[0].nb,
          latMax = paths[0].mb,
          lonMax = paths[0].nb;
      for (var i = 1, len = paths.length; i < len; i++) {
        if (paths[i].mb < latMin) {
          latMin = paths[i].mb;
        } else if (paths[i].mb > latMax) {
          latMax = paths[i].mb;
        }

        if (paths[i].nb < lonMin) {
          lonMin = paths[i].nb;
        } else if (paths[i].nb > lonMax) {
          lonMax = paths[i].nb;
        }

      }
      var lat = latMin + ((latMax - latMin) / 2);
      var lon = lonMin + ((lonMax - lonMin) / 2);
      return new google.maps.LatLng(lat, lon);
    }

  //pass the DOM element being used and the googleMapOptions
  this.map = new google.maps.Map(local.doc.getElementById('map_canvas'), this.googleMapOptions);
};


//create the info window to be used by all markers
Map.prototype.setInfoWindow = function() {
  this.infoWindow = new google.maps.InfoWindow();
};


//places the campus layer on the map
//for some reason this isn't working with the layers kml file being in Ingeniux
Map.prototype.setCampusLayer = function() {
  this.campusLayer = new google.maps.KmlLayer(this.mapOptions.campusFile, {
    suppressInfoWindows: true,
    map: this.map,
    preserveViewport: true,
    zoom: 18
  });
};


//create a google map marker
//this function needs the latitude, longitude, name, and the path of the icon being used
Map.prototype.createMarker = function(lat, lon, name, icon) {
  return new google.maps.Marker({
    position: new google.maps.LatLng(lat, lon),
    visible: false,
    map: this.map,
    title: name,
    icon: icon
  });
};


//creates an info window whenever a marker is clicked and then displays it
//it takes the marker object and the Location object
Map.prototype.createInfoWindow = function(marker, obj) {
  //create local versions so they are in the closure for the anonymous
  //event function
  var infoWindow = this.infoWindow;
  var map = this.map;
  // Listener that builds the infopane popups on marker click
    google.maps.event.addListener(marker, 'click', function() {

      var content = '',
             name = obj.name,
              img,
             link = obj.link,
            hours = obj.hours,
            phone = obj.phone,
          address = obj.address,
             info = obj.info;

              if (obj.img) {
                if (obj.img.indexOf(':') === -1) {
                  img = 'Prebuilt/maps/imgs/objects/' + obj.img;
                }
                else {
                  img = obj.img;
                }
              }
             

      // Create the info panes which hold content about each building
      content += '<div class="infopane">';
      content +=   '<h2>' + name + '</h2>';
      content +=   '<div>';
      if (img){
        content += '<img src="' + img + '" alt="' + name + '"';
        content += ' style="float:right;margin:0 0 10px 10px;';
        if (campusMap.device === 0 && window.map.embedOptions.embed === true) {
          content += " width:100px; height:75px;";
        }

        content += '"/>';
      }
      content += '<div class="button-div">';
      if (phone){
        content += '<a class="phone-call btn btn-large btn-primary icon-call" href="tel:' + phone + '" ></a>';
      }
      if (link){
        content += '<a href="' + link + '" target="_blank" class="btn btn-large btn-primary">More Info</a>';
      }
      content += '</div>';
      if (hours){
        content += '<div class="info-row info-hours"><strong>Hours:</strong> ' + hours + '</div>';
      }
      if (phone){
        content += '<div class="info-row info-phone"><strong>Phone:</strong> ' + phone + '</div>';
      }
      if (address){
        content += '<div class="info-row info-address"><strong>Address:</strong> ' + address + '</div>';
      }
      if (info){
        content += '<div class="info-row info-info"><strong>Info:</strong> ' + info + '</div>';
      }
      content += '</div>';
      content += '</div>';
      content += '<div class="addthis_toolbox addthis_32x32_style addthis_default_style">';
      content += "<p>Share this location.</p>";
      content += '<a class="addthis_button_facebook social_button"></a>';
      content += '<a class="addthis_button_google_plusone_share social_button"></a>';
      content += '<a class="addthis_button_twitter social_button"></a>';
      content += '<a class="addthis_button_compact social_button"></a>';
      content += '</div>';
      // Set the content of the InfoWindow
      infoWindow.setContent(content);
      // Open the InfoWindow
      infoWindow.open(map, marker);
      //render the add this buttons
      var addthis_share = 
      {
        url : "http://www.byui.edu/maps#" + obj.code,
        title : obj.name
      }
      addthis.toolbox('.addthis_toolbox',{},addthis_share);
    });
};

//creates an info window whenever a polygon is clicked and then displays it
//it takes the polygon object and the Area object
Map.prototype.createPolygonInfoWindow = function(polygon, obj) {
  //create local versions so they are in the closure for the anonymous
  //event function
  var infoWindow = this.infoWindow;
  var map = this.map;
  // Listener that builds the infopane popups on marker click
    google.maps.event.addListener(polygon, 'click', function(event) {

      var content = '',
             name = obj.name,
             code = obj.code,
             info = obj.info;
             

      // Create the info panes which hold content about each building
      content += '<div class="infopane">';
      content +=   '<h2>' + name + '</h2>';
      content +=   '<div>';
      if (info){
        content += '<div class="info-row info-info"><strong>Info:</strong> ' + info + '</div>';
      }
      content += '</div>';
      content += '</div>';
      content += '<div class="addthis_toolbox addthis_32x32_style addthis_default_style">';
      content += "<p>Share this location.</p>";
      content += '<a class="addthis_button_facebook social_button"></a>';
      content += '<a class="addthis_button_google_plusone_share social_button"></a>';
      content += '<a class="addthis_button_twitter social_button"></a>';
      content += '<a class="addthis_button_compact social_button"></a>';
      content += '</div>';
      // Set the content of the InfoWindow
      infoWindow.setContent(content);
      // Open the InfoWindow
      var center = polygon.getCenter();
      infoWindow.open(map);
      infoWindow.setPosition(event.latLng);
      //render the add this buttons
      var addthis_share = 
      {
        url : "http://www.byui.edu/maps#" + obj.code,
        title : obj.name
      }
      addthis.toolbox('.addthis_toolbox',{},addthis_share);
    });
};