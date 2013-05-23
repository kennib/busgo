// The busgo angular app
var app = angular.module('busgo', ['ui.map', 'ui.event', 'Parse'])

app.config(function($routeProvider) {
	// Create routes
	$routeProvider
		.when('/map', {controller: mapCtrl, templateUrl: 'map.html', reloadOnSearch: false})
		.when('/buses', {controller: busesCtrl, templateUrl: 'buses.html'})
		.when('/buses/stop/:stopId', {controller: busesCtrl, templateUrl: 'buses.html'})
		.when('/places', {controller: placesCtrl, templateUrl: 'places.html'})
		.otherwise({redirectTo: '/map'});
});

// Enable maps API
app.value('uiMapConfig', {});

// Bounds for the map
app.value('mapBounds', new google.maps.LatLngBounds(
	new google.maps.LatLng(33.077734, 150.397339),
	new google.maps.LatLng(-34.29353,151.622314)
));

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
	"#024959",
	"#C3F2C0",
	"#594153",
]);

app.factory('colorMap', function(colorList) {
	return {
		colors: colorList,
		map: {},
		index: 0,
		getColor: function(key) {
			if (this.map[key] === undefined) {
				var colorIndex = this.index%this.colors.length;
				this.map[key] = this.colors[colorIndex];
				this.index++;
			}
			return this.map[key];
		}
	};
});

// Time difference filter
app.filter('timeDiff', function() {
	return function(input, offset) {
		var time = input - offset;
		var hours = Math.abs(parseInt(time/(1000*60*60)));
		var mins = Math.abs(parseInt(time/(1000*60)) - hours*60);
		
		var result = "";
		if (hours) {
			result += hours + " ";
			result += (hours==1)? "hour":"hours";
		}
		if (mins) {
			result += mins + " ";
			result += (mins==1)? "minute":"minutes";
		} else {
			result = "<1 minute";
		}
		
		if (time < 0) {
			result += " ago";
		}
		
		return result;
	};
});

// Filter unique elements
app.filter('unique', function() {
	return function(list, key) {
		var items = {};
		for (var i in list) {
			var item = list[i];
			if (key)
				items[item[key]] = item;
			else
				item[item] = item;
		}
		return items;
	};
});

// Header directive
app.directive('busgoHeader', function() {
	return {
		templateUrl: 'header.html',
		restrict: 'E',
		replace: true,
		link: function(scope, element, attrs) {
			
		}
	}
});

