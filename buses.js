function busesCtrl($scope, $routeParams,
                   Stop) {
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
}