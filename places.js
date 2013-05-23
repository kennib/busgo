function placesCtrl($scope, $routeParams) {
	// Page attributes
	$scope.title = "Places";
	$scope.leftLink = "map";
	$scope.rightLink = "buses";
	
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
			}
		});
	} else {
		// Use Geolocation
		$scope.locationName = "here";
		navigator.geolocation.getCurrentPosition(function(position) {
			$scope.location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
		});
	}
	
	// Update places based on location or search change
	$scope.$watch('location', placeSearch);
	$scope.$watch('search', placeSearch);
	
	// Search for places near this location related to the search terms
	function placeSearch() {
	
	}
}