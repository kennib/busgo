function placesCtrl($scope, $routeParams, $timeout) {
	// Page attributes
	$scope.title = "Places";
	$scope.leftLink = "map";
	$scope.rightLink = "buses";
	
	// Radius of search results in metres
	$scope.radius = 1000;
	
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
				// Set this as the location
				$scope.location = new google.maps.LatLng(stop.stop_lat, stop.stop_lon);
				$scope.locationName = stop.stop_name + " Bus Stop";
				// Initial search
				placeSearch();
			}
		});
	} else {
		// Use Geolocation
		$scope.locationName = "here";
		navigator.geolocation.getCurrentPosition(function(position) {
			$scope.location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
			// Initial search
			placeSearch();
		});
	}
	
	// Update places based on location or search change
	$scope.$watch('location', placeSearch);
	$scope.$watch('search', placeSearch);
	
	// Search for places near this location related to the search terms
	var placesService = new google.maps.places.PlacesService(document.getElementById("placesDisplay"));
	function placeSearch() {
		// Function to update the list of places
		function updatePlaces(results, PlacesServiceStatus) {
			$scope.places = results;
			$scope.$apply();
		}
		
		// The searches
		if ($scope.search) {
			// If we have a search term
			var search = {
				query: $scope.search,
				location: $scope.location,
				radius: $scope.radius
			};
			
			placesService.textSearch(search, updatePlaces);
		} else if ($scope.location) {
			// If we only have a location
			var search = {
				keyword: "place",
				location: $scope.location,
				radius: $scope.radius
			};
			
			placesService.nearbySearch(search, updatePlaces);
		}
	}
}