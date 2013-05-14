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
	$scope.stop = {
		id: 200039,
		name: "Central Station, Eddy Av",
		lat: -33.88250732421875,
		lon: 151.2073974609375
	};
	
	$scope.mapOptions = {
		zoom: 15,
		center: new google.maps.LatLng($scope.stop.lat, $scope.stop.lon),
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	enableGestures($scope);
	
	$scope.setBusStop = function(marker) {
		// Update the old and new marker colors
		if ($scope.stopMarker)
			$scope.stopMarker.color = "ff0000";
		marker.color = "00ff00";
		// Set this as the focussed stop
		$scope.stop = marker.stop;
		$scope.stopMarker = marker;
		// Move the map to the stop
		$scope.map.panTo(marker.position);
		
		// Update start of the trip
		if (!$scope.start)
			$scope.start = marker.position.lat() + ", " + marker.position.lng();
		
		// Get a list of trips this bus stop is on
		var stoptrips = StopTrip.query({
			where: JSON.stringify({
				stop_id: $scope.stop.stop_id
			})
		});
		
		// Once we have a list of all the trips connected to this stop...
		stoptrips.then(function(stopTrips) {
			// Get the list of all the trips
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
			}).then(function(stops) {
				// Color these stops differently
				for (var s in stops) {
					var stop = stops[s];
					Stop.query({
						where: JSON.stringify({
							stop_id: stop.stop_id
						})
					}).then(function(stops) {
						for (var s=0; s<stops.length; s++) {
							// Get the stop object
							var stop = stops[s];
							
							if ($scope.stopMarkers[stop.stop_id] && stop.stop_id != $scope.stop.stop_id) {
								// Change stop marker color
								$scope.stopMarkers[stop.stop_id].color = "ffff00";
							} else {
								// Create a google maps marker
								var coord = new google.maps.LatLng(stop.stop_lat, stop.stop_lon);
								var marker = new google.maps.Marker({
									map: $scope.map,
									position: coord,
									title: stop.stop_name,
									color: "ffff00"
								});
								
								// Add it to the list of markers
								$scope.stopMarkers[stop._stop_id] = marker;
							}
						}
					});
				}
			})
		})
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
					// Update start and end markers
					var route = result.routes[0];
					var start = route.overview_path[0];
					var end = route.overview_path[route.overview_path.length-1];
					$scope.startMarker.setPosition(start);
					$scope.endMarker.setPosition(end);
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
		
		// Start and end markers
		$scope.startMarker = new google.maps.Marker({
			map: $scope.map,
			position: $scope.location,
			draggable: true,
			zIndex: 2000,
			color: "000000",
		});
		$scope.endMarker = new google.maps.Marker({
			map: $scope.map,
			position: $scope.location,
			draggable: true,
			zIndex: 2000,
			color: "ffffff",
		});
		
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
			limit: 1000
		}).then(function(stops) {
			// Add bus stop markers
			$scope.stopMarkers = {};
			for (var s=0; s<stops.length; s++) {
				// Get the stop object
				var stop = stops[s];
				
				// Create a google maps marker
				var coord = new google.maps.LatLng(stop.stop_lat, stop.stop_lon);
				var marker = new google.maps.Marker({
					map: $scope.map,
					position: coord,
					title: stop.stop_name,
					stop: stop,
				});
				
				// Add it to the list of markers
				$scope.stopMarkers[stop.stop_id] = marker;
				
				// Set the closest bus stop as the focussed bus stop
				if (s == 0) // first bus stop is the closest
					$scope.setBusStop(marker)
			}
		});
	});
	
	mapRoute("11954_X94", $scope);
}
