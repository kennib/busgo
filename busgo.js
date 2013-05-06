angular.module('busgo', ['ui.map'])
       .value('uiMapConfig', {});

function stopCtrl($scope) {
	$scope.stop = {
		id: 200039,
		name: "Central Station, Eddy Av",
		lat: -33.88250732421875,
		lon: 151.2073974609375
	};
	
	$scope.mapOptions = {
		zoom: 16,
		center: new google.maps.LatLng($scope.stop.lat, $scope.stop.lon),
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	
	enableGestures($scope);
}
