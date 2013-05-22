function busesCtrl($scope, $routeParams, $http,
                   Stop, Parse) {
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
}