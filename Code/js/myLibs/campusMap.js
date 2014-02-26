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
 *				 was on a mobile device or a desktop to alter styling but is no longer necessary because
 *				 all of the styling between different devices is handles in the CSS with media queries
 * categories - array - will hold all of the categories for the map
 * globals - object - an object literal that contains a local reference to the window object and the document object
 *					 for use in any methods as well as passing to other objects upon initialization when they need
 *					 a local version
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
    this.element = (options['element']) ? options['element'] : console.log("No element provided."),
    this.menuState = (options['menuState']) ? options['menuState'] : 1,
    this.includeMenus = (options['includeMenus'] == null) ? true : options['includeMenus'],
    this.KMLFiles = (options['categories']) ? options['categories'] : console.log("No KML Files specified"),
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
}


//builds the needed HTML for the map
CampusMap.prototype.buildHTML = function () {
    //only include the header if they want it
    var html = (this.includeMenus) ? '<div id="title"><h1 id="heading">BYU-Idaho Campus Map</h1><a style="display: none;" id="device_type" href="#" onmousedown="toggleDevice(); return false;" title="Switch Device Type"><div id="device_container"><div class="device icon-desktop"></div><div class="device icon-mobile"></div></div></a><a id="menu_button" class="icon-settings" href="#" title="Open Menu. Click this or press [space] bar"></a></div>' : "";
    html += '<div id="container" name="container">';
    //only include the menu if they want it
    html += (this.includeMenus) ? '<div id="menu" name="menu" style="display:block; z-index: 2;"><div id="inner_menu" class="scrolling-element-class" ><div id="object_search"><div class="search-wrapper"><input type="text" placeholder="Search"/><span class="icon-cancel"></span></div></div><nav id="categories" class="child-element"></nav><!-- // categories --></div><!-- // inner menu --><div id="notification" class="hybrid"><a id="info" title="[Coming Soon] More info about this map" class="icon-info" href="#"></a><a id="feedback" title="Submit feedback about this map" class="icon-feedback" target="_blank" href="http://www.byui.edu/feedback/maps"></a></div></div><!-- // menu -->' : "";
    html += '<div id="map_canvas"><div id="nojs-msg"><br/>This BYU-Idaho Campus Map application requires Javascript to run. <br/>Your device or browser doesn\'t appear to have JavaScript enabled. <br/>Please enable it and try again, or try another device or browser.</div></div>';
    html += '<div id="map_keys"></div>';
    //place the html into the dom where they have specified it to be located
    this.globals.doc.getElementById(this.element).innerHTML = html;
}


//asynchronasly loads the category/objects file and then parses it
CampusMap.prototype.loadKMLFiles = function (callback) {
    //make local copies of these attributes so they can be used within this closure
    //you can't use this in the onreadystatechange function because it will refer to 
    //that function's attributes and not the CampusMap attributes
    var parent = this;

    //get any stored information from localStorage
    var json = (localStorage) ? localStorage.mapData : undefined;
    var mapData = (json) ? JSON.parse(json) : {};

    //loop through all of the given KML files and load them
    for (var i = 0, len = this.KMLFiles.length; i < len; i++) {
        var filePath = this.KMLFiles[i];
        var split = filePath.split(".");
        var index = split[split.length - 2];

        if (mapData[index]) {
            this.buildCategories(mapData[index]);
        } else {
            //create the xmlhttp object
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
                    var data = new KMLParser(xmlhttp.responseText);
                    mapData[index] = data;
                    parent.buildCategories(data);
                    if (callback && typeof (callback) === "function") {
                        callback();
                    }
                }
            }
            //cannot be asynchronous or else it will not load them all
            xmlhttp.open("GET", filePath, false);
            xmlhttp.send();
        }
    }

    //once everything is done we will save the information to local storage
    localStorage.mapData = JSON.stringify(mapData);
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
}


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
}


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
}


//detects what kind of device is being 
CampusMap.prototype.detectDevice = function () {
    var width = this.globals.doc.getElementById(this.element).offsetWidth;
    //it was determined that anything less than 800 pixels would be considered a mobile device
    this.device = (width < 800) ? 0 : 1;
}


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
}


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
}


//gets the height of the element that the map is being embedded into
CampusMap.prototype.getMapHeight = function () {
    var height = this.globals.doc.getElementById(this.element).offsetHeight;
    return (this.includeMenus) ? height - 57 : height;
}


//sets the height of the elements the CampusMap object creates to hold the map
//so that it can fill the element it is being embedded into
CampusMap.prototype.setMapHeight = function () {
    var height = this.getMapHeight();
    var container = this.globals.doc.getElementById('container');
    container.style.height = height + "px";
    var map_canvas = this.globals.doc.getElementById('map_canvas');
    map_canvas.style.height = height + "px";
}


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

}


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
}


//attaches the event listener to the menu button to open and close it
CampusMap.prototype.bindMenuButton = function () {
    this.addClickHandler(this.globals.doc.getElementById('menu_button'), function () {
        //uses the campusMap object to toggle the menu since the this keyword will refer
        //to the current anonymous function
        campusMap.toggleMenu();
    });
}


//toggle the menu depending on it's current state
CampusMap.prototype.toggleMenu = function () {
    (this.menuState) ? this.hideMenu() : this.showMenu();
}


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
}


//show the menu
CampusMap.prototype.showMenu = function () {
    this.menuState = 1;
    this.updateTransform(this.globals.doc.getElementById('menu'),0,0);
}


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
}


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
}


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
}

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
}


//crossbrowser solution for adding click events
CampusMap.prototype.addClickHandler = function (element, callback) {
    try {
        element.addEventListener('click', callback);
    } catch (e) {
        element.attachEvent("onclick", callback);
    }
}

CampusMap.prototype.addKeyUpListener = function (element, callback) {
    try {
        element.addEventListener('keyup', callback);
    } catch (e) {
        element.attachEvent("onkeyup", callback);
    }
}

//this function will test for geolocation support and then prompt the user for their location
CampusMap.prototype.getLocation = function () {
    if (navigator.geolocation && this.device === 0) {
        navigator.geolocation.getCurrentPosition(this.showPosition);
    }
}

//this function will show the users position on the map
CampusMap.prototype.showPosition = function (position) {
    var marker = map.createMarker(position.coords.latitude, position.coords.longitude, "You are here", "imgs/icons/youarehere.png");
    marker.setVisible(true);
}
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
}
CampusMap.prototype.updateTransform = function (element, x, y) {
    element.style.webkitTransform = "translate(" + x + "px," + y + "px)";
    element.style.mozTransform = "translate(" + x + "px," + y + "px)";
    element.style.transform = "translate(" + x + "px," + y + "px)"
}