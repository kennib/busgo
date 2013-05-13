var app = angular.module('busgo', ['ui.map', 'Parse'])

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

// Map a route
app.factory('mapRoute', function(Trip, Shape) {
	return function(route_id, scope) {
		// Find the trip
		Trip.query({
			where: {
				route_id: route_id
			},
			limit: 1
		}).then(function(trips) {
			var trip = trips[0]
			// Get the route's shape
			Shape.query({
				where: {
					shape_id: trip.shape_id
				}
			}).then(function(shape_points) {
				// Get the points into an array
				var points = [];
				for (var p in shape_points) {
					var point = shape_points[p];
					var latlng = new google.maps.LatLng(point.shape_pt_lat, point.shape_pt_lon);
					points[point.shape_pt_sequence] = latlng;
				}
				// Create the line
				new google.maps.Polyline({
					map: scope.map,
					path: points 
				});
			});
		});
	};
});


function stopCtrl($scope, Stop, mapRoute) {
	$scope.stop = {
		id: 200039,
		name: "Central Station, Eddy Av",
		lat: -33.88250732421875,
		lon: 151.2073974609375
	};
	
	$scope.mapOptions = {
		zoom: 16,
		center: new google.maps.LatLng($scope.stop.lat, $scope.stop.lon),
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	enableGestures($scope);	
	
	// Get the user's location
	navigator.geolocation.getCurrentPosition(function(position) {
		$scope.location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
		
		// Get the closest bus stop
		Stop.query({
			where: JSON.stringify({
				stop_latlng: {
					"$nearSphere": {
						"__type": "GeoPoint",
						"latitude": position.coords.latitude,
						"longitude": position.coords.longitude
					}
				}
			}),
			limit: 1000
		}).then(function(stops) {
			var stop = stops[0];
			$scope.stop = stop;
			var stopLatlng = new google.maps.LatLng(stop.stop_lat, stop.stop_lon);
			// Create a marker for the closest bus stop
			$scope.stop.color = "00FF00";
			$scope.stopMarker = new google.maps.Marker({
				map: $scope.map,
				position: stopLatlng,
				title: stop.stop_name,
				zIndex: 9999999 // Should appear in front of other markers
			});
			// Move the map to the stop
			$scope.map.panTo(stopLatlng);
			
			// Add bus stop markers
			$scope.stopMarkers = [];
			for (var s=1; s<stops.length; s++) {
				// Get the stop object
				var stop = stops[s];
				
				// Create a google maps marker
				var coord = new google.maps.LatLng(stop.stop_lat, stop.stop_lon);
				var marker = new google.maps.Marker({
					map: $scope.map,
					position: coord,
					title: stop.stop_name
				});
				
				// Add it to the list of markers
				$scope.stopMarkers.push(marker);
			}
		});
	});
	
	mapRoute("11954_X94", $scope);
}
