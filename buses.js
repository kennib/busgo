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
		
		// Get the buses
		var now = new Date();
		var time = now.getHours() + ':' + now.getMinutes()  + ':' + now.getSeconds();
		Parse.callFunction("busTimes", {
				time: time,
				stop: $scope.stop,
				limit: 20
		}).then(function(buses) {
			$scope.buses = buses;
		});
	});
}