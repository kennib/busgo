function busesCtrl($scope, $routeParams, $timeout, $route,
                   Stop, Parse) {
	// Page attributes
	$scope.busesLink = "buses";
	$scope.placesLink = "places";
	$scope.mapLink = "map";
	
	
	if ($routeParams.stopId) {
		// Update links
		$scope.placesLink = "places/stop/"+$routeParams.stopId;
		$scope.mapLink = "map?stop="+$routeParams.stopId;
	}
	
	// Get the stop
	var stopId = $routeParams.stopId;
	Stop.query({
		where: JSON.stringify({
			stop_id: stopId
		})
	}).then(function(stops) {
		if (stops.length > 0) {
			$scope.stop = stops[0];
		} else {
			$scope.stop = {name: "Invalid stop"};
		}
	});
	
	// Get the buses
	var now = new Date();
	now.setDate(1); now.setMonth(0); now.setYear(1970);  // Just the time part of the date
	var time = now.getTime();
	Parse.callFunction("busTimes", {
			time: time,
			stop_id: stopId,
			limit: 20
	}).then(function(buses) {
		$scope.buses = buses;
	});
	
	// Current time
	function updateTime() {
		var time = new Date();
		time.setDate(1); time.setMonth(0); time.setYear(1970);
		$scope.now = time.getTime();
		$timeout(updateTime, 30000);
	}
	updateTime();
}
