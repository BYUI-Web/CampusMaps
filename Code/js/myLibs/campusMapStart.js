var campusMap, map;

//adds the script for the addthis social sharing api
addScript("https://s7.addthis.com/js/300/addthis_widget.js#pubid=xa-51f6872a25a1fb8c", { win: window, doc: document });
addScript("js/vendor/promise.min.js", { win: window, doc: document }, function() {
    //both of the constructors takes a global options object literal containing all of the options the user
    //wishes to set for the campus map
    //it is optional for the Map constructor but not for the CampusMap object as you need to specify the id of the element
    //it will be embedded in
    campusMap = new CampusMap(options);
    map = new Map(options);
});
//addScript("https://www.byui.edu/Prebuilt/maps/js/vendor/modernizr-2.6.1.min.js", {doc: document});


/***************************************************
* this function is used to add a script to the page
* takes two parameters
* src - the relative or absolute url of the script to be embeded
* local - an object literal containing the document element
*			{ doc : document}
****************************************************/
function addScript(src, local, callback) {
	var script = local.doc.createElement("script");
	script.type = "text/javascript";
	script.src = src;
    //check for callback
    if (typeof callback === "function") {
        script.onload = callback;
    }
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
  };
}