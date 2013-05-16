var app = angular.module('busgo', ['ui.map', 'ui.event', 'Parse'])

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


function stopCtrl($scope, Stop, StopTrip, mapRoute) {
	// Bus stops accessible by id
	$scope.stops = {};
	
	// The start and end points of the destination
	$scope.start = ""; $scope.startPos = {};
	$scope.end = ""; $scope.endPos = {};
	
	// Default main bus stop
	$scope.stopMain = {
		stop_id: 200039,
		stop_name: "Central Station, Eddy Av",
		stop_lat: -33.88250732421875,
		stop_lon: 151.2073974609375
	};
	// Marker settings for the main bus stop
	$scope.stopMainMarker = {zIndex: 1000};
	// The bus stops connected to the main stop
	$scope.stopsConnected = {};
	
	// Options for the Google map
	$scope.mapOptions = {
		zoom: 15,
		center: new google.maps.LatLng($scope.stopMain.stop_lat, $scope.stopMain.stop_lon),
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	
	// Enable the kinect gestures
	enableGestures($scope);
	
	$scope.setBusStop = function(stop) {
		// Set this as the main stop
		$scope.stopMain = stop;
		// Move the map to the stop
		var pos = new google.maps.LatLng(stop.stop_lat, stop.stop_lon);
		$scope.map.panTo(pos);
		
		// Update start of the trip
		if (!$scope.start)
			$scope.start = stop.stop_lat + ", " + stop.stop_lon;
		
		// Get a list of trips this bus stop is on
		var stoptrips = StopTrip.query({
			where: JSON.stringify({
				stop_id: stop.stop_id
			})
		}).then(function(stopTrips) {
			// Get the list of all the trip_ids
			var trips = []
			for (var st in stopTrips) {
				var stopTrip = stopTrips[st];
				trips.push(stopTrip.route_id);
			}
			
			// Find all stops on these trips
			StopTrip.query({
				where: JSON.stringify({
					route_id: {"$in": trips}
				})
			}).then(function(stopTrips) {
				var stops = []
				for (var st in stopTrips) {
					var stopTrip = stopTrips[st];
					stops.push(stopTrip.stop_id);
				}
				
				Stop.query({
					where: JSON.stringify({
						stop_id: {"$in": stops}
					})
				}).then(function(stops) {
					$scope.stopsConnected = stops;
				});
			});
		});
	};
	
	// Update the directions from the Google directions service
	var directions = new google.maps.DirectionsService(); 
	var directionsDisplay = new google.maps.DirectionsRenderer({suppressMarkers: true});
	var updateDirections = function() {
		if ($scope.start && $scope.end) {
			directions.route({
				origin: $scope.start + ", Sydney",
				destination: $scope.end + ", Sydney",
				travelMode: google.maps.TravelMode.TRANSIT
			}, function(result, status) {
				if (status == google.maps.DirectionsStatus.OK) {
					// Update start and end positions
					var route = result.routes[0];
					$scope.startPos = route.overview_path[0];
					$scope.endPos = route.overview_path[route.overview_path.length-1];
					// Show directions on the map
					directionsDisplay.setMap($scope.map);
					directionsDisplay.setDirections(result);
				}
			});
		}
	};
	
	// Request directions only if not requested again within the delay time
	var directionsRequest;
	requestDirections = function() {
		var delay = 1500;
		clearTimeout(directionsRequest);
		directionsRequest = setTimeout(function() {
			clearTimeout(directionsRequest);
			updateDirections();
		}, delay);
	};
	
	// Update start and end of the trip
	$scope.$watch("start", requestDirections);
	$scope.$watch("end", requestDirections);
	
	// Get the user's location
	navigator.geolocation.getCurrentPosition(function(position) {
		$scope.location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
		
		// Get the closest bus stops
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
			limit: 10
		}).then(function(stops) {
			// Set these as the bus stops
			$scope.stops = stops;
			// Main stop is the closest stop
			$scope.setBusStop(stops[0]);
		});
	});
	
	mapRoute("11954_X94", $scope);
}
