// The busgo angular app
var app = angular.module('busgo', ['ui.map', 'ui.event', 'Parse'])

app.config(function($routeProvider) {
	// Create routes
	$routeProvider
		.when('/map', {controller: mapCtrl, templateUrl: 'map.html', reloadOnSearch: false})
		.when('/buses', {controller: busesCtrl, templateUrl: 'buses.html'})
		.when('/buses/stop/:stopId', {controller: busesCtrl, templateUrl: 'buses.html'})
		.when('/places', {controller: placesCtrl, templateUrl: 'places.html'})
		.when('/places/stop/:stopId', {controller: placesCtrl, templateUrl: 'places.html'})
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

// Filter strings formatted_like_this so they are Formatted like this
app.filter('prettify', function() {
	return function(string) {
		// Replace '_' with ' '
		var out = string.replace(/_/g, ' ');
		// Uppercase first letter
		if (out.length > 0)
			out = out[0].toUpperCase() + out.slice(1);
		
		return out;
	};
});

// Filter that checks if item is in a list
app.filter('in', function() {
	return function(item, list) {
		return list && list.indexOf(item) != -1;
	};
});

// Filter that returns a given value if the input is true
app.filter('true', function() {
	return function(input, value) {
		if (input)
			return value;
		else
			return input;
	};
});

// Filter that returns a given value if the input is false
app.filter('false', function() {
	return function(input, value) {
		if (!input)
			return value;
		else
			return input;
	};
});

// Header directive
app.directive('busgoHeader', function() {
	return {
		templateUrl: 'header.html',
		restrict: 'E',
		replace: true,
		link: function(scope, element, attrs) {
			// Style selected element
			document.getElementById(attrs["selected"]+"Tab").classList.add("selected");
		}
	}
});

// Google maps directions service
app.factory('directions', function($timeout) {
	var directions = new google.maps.DirectionsService(); 
	return function(options, success, tryagain) {
		var result = {};
		
		// The function to receive the directions from the API
		var getDirs = function(dirs, status) {
			if (status == google.maps.DirectionsStatus.OK) {
				// Method to get the set of directions' first route
				dirs.firstRoute = function() {
					if (this.routes.length > 0 && this.routes[0].legs.length > 0)
						return this.routes[0].legs[0];
				};
				angular.extend(result, dirs);
				// Success callback
				if (success)
					success(result, status);
			} else if (status == google.maps.DirectionsStatus.OVER_QUERY_LIMIT) {
				// Try getting directions again
				if (tryagain != undefined)
					$timeout(function() {
						directions.route(options, getDirs);
					}, 2000);
			}
		}
		
		// Get directions
		directions.route(options, getDirs);
		
		return result;
	};
});

