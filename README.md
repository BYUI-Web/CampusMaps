<h1>Features</h1>
<p>The Campus Maps contain several features that will allow students, faculty, parents, or other visitors to easily navigate the BYU-Idaho Campus.  It utilizes Google maps API, as well as some KML files to help others locate points of interest around campus.  It allows a user to navigate through a list of categories to find specific locations that they would like to find.  To aid in finding these points a search function has been added to allow users to search for what they are looking for.</p>
<h1>How it Works</h1>
<p>The Maps have been made to read a KML file. <a href="http://en.wikipedia.org/wiki/KML">(Information on KML)</a>. Each KML file represents a category and within this category a user can specify any number of points or polygons.</p>
<p>Because the reading and parsing of the KML files can be slow at times, localStorage has been utilized so that after a KML file is parsed it will save it's information.  Then when the person returns to the map it doesn't have to parse the files and just read the information from localStorage.</p>
<p>The maps are also embedable so that people can create their own KML files and have their own map experience on their web page.</p>
<h1>How to use</h1>
<strong>These instructions assume that you are using the Ingeniux CMS as that is what BYU-Idaho uses.  If you are not, the responsibility is yours to alter any paths for your own use.</strong>
<p>There is a single file needed and a global options object needed to make the Campus Maps work.</p>
<p>First thing to do is to create an element that will house your map.
<code>&lt;div id="map" style="width: 500px; height: 500px"&gt;&lt;/div&gt;</code>
You should give your element an id and a width and height.</p>
<p>Next you should create a global options object.  Then using Key Value pairs define your options.
<code>var options = {
   "element":"map",
   "categories":["Documents/Google Maps/CampusBuildings.kml","Documents/Google Maps/Parking.kml"]
}</code>
There are many options you can specify that will allow you to customize your experience.
<ul>
          <li>element – the id of the element you created to embed the maps into</li>
          <li>includeMenus – Whether or not to include the header and menu.  If you do not then all of the points and polygons in your KML file will be displayed on load.
                    <ul>
                              <li>Takes a true or false Boolean</li>
                              <li>default - true</li>
                    </ul>
          </li>
          <li>menuState – Whether the menu should default open or closed
                    <ul>
                              <li>takes a 0 or 1 for closed and open respectively</li>
                              <li>default – 1</li>
                    </ul>
          </li>
          <li>categories – an array of the URLS of your KML files</li>
                    <ul>
                              <li>takes an array of strings</li>
                    </ul>
          </li>
          <li>campusOverlayVisible – whether you want the campus overlay on your map
                    <ul>
                              <li>Takes a true or false Boolean</li>
                              <li>default – true</li>
                    </ul>
          </li>
          <li>coordinates – the latitude and longitude you want the map to center on when it loads
                    <ul>
                              <li>Takes an array of floats, latitude first, then longitude</li>
                              <li>default – [43.815045,-111.783515]</li>
                    </ul>
          </li>
          <li>embed – whether or not the map is being embedded
                    <ul>
                              <li>takes a true or false Boolean</li>
                              <li>default – false</li>
                    </ul>
          </li>
          <li>zoom – the zoom level you want the map to be at</li>
                    <ul>
                              <li>takes an integer</li>
                              <li>default – 16</li>
                    </ul>
          </li>
          <li>mapView – The map view you wish it to load in satellite or map
                    <ul>
                              <li>takes a string of either “satellite” or “map”</li>
                              <li>default – “satellite”</li>
                    </ul>
          </li>
</ul>
After creating your options variable add another script tag to pull in the campusMap.min.js file
</p>
<h1>New Changes</h1>
<h4>September 10, 2013</h4>
<ul>
          <li>Maps no longer use a single JSON file to get the data.  Uses multiple KML files created in Google Earth.  Each KML file represents a single category</li>
          <li>Maps now work in IE8+, Firefox, Chrome, Safari, and Opera</li>
</ul>
<h4>August 26, 2013</h4>
<ul>
  <li>Developed using OOP</li>
  <li>Maps can be embedded with a single script file and a global options object</li>
  <li>Categories can now contain any combination of Polygons and Placemarks</li>
</ul>
<h4>July 31, 2013</h4>
<ul>
  <li>Added search capabilities.</li>
  <li>Added the ability to pull up a location with a unique URL.</li>
  <li>Added sharing functionality</li>
  <li>Uploaded everything to Ingeniux and it now runs in Ingeniux</li>
</ul>
<h1>Future Features</h3>
<p>There are many possible additions that have been proposed to The Campus Maps</p>
<ul>
  <li>Make Polygons clickable, opening a info window</li>
  <li>Allowing a user to get directions to a location by opening them up in either their native maps app or to the desktop version.</li>
  <li>Making the maps indexable by creating an XML document in Ingeniux that allows search engines to index the unique URLS for each location.</li>
  <li>Making the data be pulled from the schools GIS servers and allow faculty to submit additions.</li>
  <li>Make it location aware so that you can see where you are in relation to everything else.</li>
  <li>Performance enhancements to make it faster and more responsive to user interaction.</li>
  <li>Put everything inside a module to not flood the Window object
          <ul>
                    <li>Currently each object has it's own copy of the window and document object to keep them local but if it's in a module this can be changed</li>
          </ul>
</ul>
