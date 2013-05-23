function mapCtrl($scope, $routeParams, $location,
                 Stop, StopTrip, Trip, Shape, colorMap, mapBounds) {
	// Page attributes
	$scope.title = "Map";
	$scope.leftLink = "buses";
	$scope.rightLink = "places";
	
	// A list of colors for styling routes etc
	$scope.routeColours = colorMap;
	
	// Bus stops accessible by id
	$scope.stops = {};
	
	// The start and end points of the destination
	$scope.start = ""; $scope.startPos = undefined;
	$scope.end = ""; $scope.endPos = undefined;
	$scope.marker = {draggable: true, zIndex: 1001};
	
	// Marker settings for the main bus stop
	$scope.stopMainMarker = {zIndex: 1000};
	// The bus trips connected to the main stop
	$scope.stopTrips = {};
	// The bus stops connected to the main stop
	$scope.stopsConnected = {};
	
	// Options for the Google map
	$scope.mapOptions = {
		zoom: 15,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	
	// Enable the kinect gestures
	enableGestures($scope);
	
	$scope.setBusStop = function(stop) {
		// Update urls
		$location.replace();
		$location.search("stop", stop.stop_id);
		$scope.leftLink = "buses/stop/"+stop.stop_id;
		$scope.rightLink = "places/stop/"+stop.stop_id;
		
		// Set this as the main stop
		$scope.stopMain = stop;
		// Move the map to the stop
		var pos = new google.maps.LatLng(stop.stop_lat, stop.stop_lon);
		$scope.map.panTo(pos);
		
		// Update start of the trip
		if (!$scope.start)
			$scope.start = stop.stop_lat + ", " + stop.stop_lon;
		
		// Get the bus stops with 500m
		closestStops(stop.stop_latlng.latitude, stop.stop_latlng.longitude, 0.5);
		
		// Get a list of trips this bus stop is on
		var stoptrips = StopTrip.query({
			where: JSON.stringify({
				stop_id: stop.stop_id
			}),
			limit: 100
		}).then(function(stopTrips) {
			// Get the list of all the trip_ids
			var trips = [];
			for (var st in stopTrips) {
				var stopTrip = stopTrips[st];
				trips.push(stopTrip.route_id);
			}
			
			// Get the trip data
			Trip.query({
				where: JSON.stringify({
					trip_id: {"$in": trips}
				}),
				limit: 100
			}).then(function(trips) {
				// Get the list of all the shape_ids
				var shapes = [];
				var shapeTrips = {};
				var uniqueTrips = {};
				for (var t in trips) {
					var trip = trips[t];
					trip.route = trip.route_id.split("_")[1];
					var id = [trip.shape_id].join('//');
					uniqueTrips[id] = trip;
					shapes.push(trip.shape_id);
					
					if (shapeTrips[trip.shape_id] === undefined)
						shapeTrips[trip.shape_id] = [];
					shapeTrips[trip.shape_id].push(trip);
				}
				
				// Set these as the trips visible for this stop
				$scope.stopTrips = uniqueTrips;
				
				// Get all the points in each shape
				Shape.query({
					where: JSON.stringify({
						shape_id: {"$in": shapes}
					}),
					limit: 1000
				}).then(function(points) {
					// Get list of coords for each shape
					var shapes = {};
					for (var p in points) {
						var point = points[p];
						var shape = shapes[point.shape_id];
						
						if (shape == undefined)
							shape = shapes[point.shape_id] = [];
						
						var latlng = new google.maps.LatLng(point.shape_pt_lat, point.shape_pt_lon);
						shape[point.shape_pt_sequence] = latlng;
					}
					
					// Assign each shape to its trip
					for (var shape_id in shapes) {
						var shape = shapes[shape_id];
						var trips = shapeTrips[shape_id];
						for (var t in trips) {
							var trip = trips[t];
							trip.path = shape;
						}
					}
				});
			});
		});
	};
	
	// Update the directions from the Google directions service
	var directions = new google.maps.DirectionsService(); 
	var directionsDisplay = new google.maps.DirectionsRenderer({suppressMarkers: true});
	var updateDirections = function() {
		if ($scope.startPos && $scope.endPos) {
			directions.route({
				origin: $scope.startPos,
				destination: $scope.endPos,
				travelMode: google.maps.TravelMode.TRANSIT
			}, function(result, status) {
				if (status == google.maps.DirectionsStatus.OK) {
					// Show directions on the map
					directionsDisplay.setMap($scope.map);
					directionsDisplay.setDirections(result);
				}
			});
		}
	};
	
	// Add autocomplete for trip start/end
	var autocompleteOptions = {
		bounds: mapBounds,
		componentRestrictions: {country: "au"},
	};
	var startAutocomplete = new google.maps.places.Autocomplete(document.getElementById('start'), autocompleteOptions);
	var endAutocomplete = new google.maps.places.Autocomplete(document.getElementById('end'), autocompleteOptions);
	
	// Watch for a change in start/end positions
	google.maps.event.addListener(startAutocomplete, 'place_changed', function() {
		var place = this.getPlace();
		$scope.startPos = place.geometry.location;
		alignMap();
	});
	google.maps.event.addListener(endAutocomplete, 'place_changed', function() {
		var place = this.getPlace();
		$scope.endPos = place.geometry.location;
		alignMap();
	});
	
	// Align the map based on start/end locations
	function alignMap() {
		if ($scope.startPos && $scope.endPos) {
			$scope.map.panToBounds(new google.maps.LatLngBounds($scope.startPos, $scope.endPos));
		} else if ($scope.startPos) {
			$scope.map.panTo($scope.startPos);
		} else if ($scope.endPos) {
			$scope.map.panTo($scope.endPos);
		}
	};
	
	// Update start/end text on marker position change
	// Update directions when positions are changed
	$scope.$watch('startPos', function(newPos) {
		updateDirections();
		if (newPos !== undefined)
			$scope.start = newPos.toString();
	});
	$scope.$watch('endPos', function(newPos) {
		updateDirections();
		if (newPos !== undefined)
			$scope.end = newPos.toString();
	});
	
	// Get the closest bus stops
	function closestStops(lat, lng, dist) {
		Stop.query({
			where: JSON.stringify({
				stop_latlng: {
					"$nearSphere": {
						"__type": "GeoPoint",
						"latitude": lat,
						"longitude": lng
					},
					"$maxDistanceInKilometers": dist
				}
			})
		}).then(function(stops) {
				// Set these as the bus stops
				$scope.stops = stops;
		});
	}
	
	// Get the user's location
	if ($routeParams.stop) {
		// Use URL route parameter to find a stop
		Stop.query({
			where: JSON.stringify({
				stop_id: $routeParams.stop
			})
		}).then(function(stops) {
			if (stops.length > 0) {
				// Set this as the main bus stop
				var stop = stops[0];
				$scope.setBusStop(stop);
				// Set this as the start location
				$scope.startPos = new google.maps.LatLng(stop.stop_lat, stop.stop_lon);
			}
		});
	} else {
		// Use Geolocation
		navigator.geolocation.getCurrentPosition(function(position) {
			$scope.location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
			$scope.startPos = $scope.location;
			
			// Get the closest bus stop
			Stop.query({
				where: JSON.stringify({
					stop_latlng: {
						"$nearSphere": {
							"__type": "GeoPoint",
							"latitude": $scope.location.lat(),
							"longitude": $scope.location.lng()
						}
					}
				}),
				limit: 1
			}).then(function(stops) {
				if (stops.length > 0) {
					// Set this as the main bus stop
					var stop = stops[0];
					$scope.setBusStop(stop);
				}
			});
		});
	}
}