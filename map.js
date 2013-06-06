function mapCtrl($scope, $routeParams, $location,
                 Stop, StopTrip, Trip, Shape,
                 colorMap, mapBounds, directions,
                 busgoParams, busgoLocation) {
	// Page attributes
	$scope.mapLink = "map";
	$scope.busesLink = "buses";
	$scope.placesLink = "places";
	
	// A list of colors for styling routes etc
	$scope.routeColours = colorMap;
	
	// Bus stops accessible by id
	$scope.stops = {};
	// Max distance away a stop can be (in metres)
	$scope.stopDistance = 1200;
	
	// The start and end points of the destination
	$scope.start = ""; $scope.startPos = undefined; $scope.startIcon = "mapicons/start.png";
	$scope.end = ""; $scope.endPos = undefined; $scope.endIcon = "mapicons/end.png";
	$scope.marker = {draggable: true, zIndex: 1001};
	
	// Marker settings for the main bus stop
	$scope.stopMainMarker = {zIndex: 1000};
	// The bus trips connected to the main stop
	$scope.stopTrips = {};
	// The bus stops connected to the main stop
	$scope.stopsConnected = {};
	
	// Method of travel
	$scope.travelMode = google.maps.TravelMode.TRANSIT;
	
	// Options for the Google map
	$scope.mapOptions = {
		zoom: 15,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	
	// Enable the kinect gestures
	enableGestures($scope);
	
	// Go to the buses page for this stop
	$scope.busesPage = function(stop) {
		busgoLocation("buses", {stop: stop.stop_id});
	}
	
	// Update the directions from the Google directions service
	var directionsDisplay = new google.maps.DirectionsRenderer({suppressMarkers: true});
	var updateDirections = function() {
		if ($scope.startPos && $scope.endPos) {
			directions({
				origin: $scope.startPos,
				destination: $scope.endPos,
				travelMode: $scope.travelMode
			}, function(result, status) {
					// Show directions on the map
					directionsDisplay.setMap($scope.map);
					directionsDisplay.setDirections(result);
			}, true);
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
		if (newPos != undefined) {
			closestStops(newPos.lat(), newPos.lng(), $scope.stopDistance);
			$scope.map.panTo(newPos);
		}
	});
	$scope.$watch('endPos', function(newPos) {
		updateDirections();
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
					"$maxDistanceInKilometers": dist/1000
				}
			})
		}).then(function(stops) {
				// Set these as the bus stops
				$scope.stops = stops;
		});
	}
	
	// Get the user's location
	var routeParams = busgoParams($routeParams);
	if (routeParams.stop) {
		// Use URL route parameter to find a stop
		Stop.query({
			where: JSON.stringify({
				stop_id: routeParams.stop
			})
		}).then(function(stops) {
			if (stops.length > 0) {
				// Set this as the main bus stop
				var stop = stops[0];
				// Set this as the start location
				$scope.startPos = new google.maps.LatLng(stop.stop_lat, stop.stop_lon);
				$scope.start = "Bus Stop at " + stop.stop_name;
				$scope.busesLink = "buses?stop="+stop.stop_id;
			}
		});
	} else {
		// Use Geolocation
		navigator.geolocation.getCurrentPosition(function(position) {
			$scope.location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
			$scope.startPos = $scope.location;
			$scope.start = "My Location";
			
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
				}
			});
		}, function() {
			// Can't get user's location, assume Sydney
			var sydney = new google.maps.LatLng(-33.883367,151.205946);
			$scope.startPos = sydney;
			$scope.map.panTo(sydney);
			closestStops(sydney.lat(), sydney.lng(), $scope.stopDistance);
			$scope.start = "Sydney";
		});
	}
	
	// Get destination
	if (routeParams.end) {
		$scope.endPos = routeParams.end;
		if (routeParams.endName)
			$scope.end = routeParams.endName;
	}
	
	if (routeParams.travelMode) {
		$scope.travelMode = routeParams.travelMode;
	}
}
