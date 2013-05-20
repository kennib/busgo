// The busgo angular app
var app = angular.module('busgo', ['ui.map', 'ui.event', 'Parse'])

app.config(function($routeProvider) {
	// Create routes
	$routeProvider
		.when('/map', {controller: mapCtrl, templateUrl: 'map.html'})
		.when('/buses', {controller: busesCtrl, templateUrl: 'buses.html'})
		.when('/places', {controller: placesCtrl, templateUrl: 'places.html'})
		.otherwise({redirectTo: '/map'});
});

// Enable maps API
app.value('uiMapConfig', {});

// Enable Parse API
app.config(function (ParseProvider) {
	ParseProvider.initialize("XdeNxntxTKqBv0QvjsZfWdhKxmy74wMeqM4M42p5", "axK8ik0ppHi1smnjsQtTx04buL0M0FNKNKhb7vky");
});
app.run(function(Parse) {
	return Parse.auth.resumeSession();
});

// Create Parse objects
var parseClasses = {
	Stop: "stops",
	Shape: "shapes",
	StopTime: "stop_times",
	Trip: "trips",
	StopTrip: "stop_routes",
	Route: "routes",
};

for (var className in parseClasses) {
	var factory = function() {
		var parseName = parseClasses[className];
		app.factory(className, function(Parse) {
			return Parse.newModel(parseName);
		});
	}();
}

// A list of colors for styling sets of objects
app.value('colorList', [
	"#0F808C",
	"#6C8C26",
	"#F2A71B",
	"#F26A1B",
	"#D91818",
	"#691CF2",
	"#44F29C",
])
