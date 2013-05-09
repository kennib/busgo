var app = angular.module('busgo', ['ui.map', 'Parse'])
// Enable maps API
app.value('uiMapConfig', {});
// Enable Parse API
app.config(function (ParseProvider) {
	ParseProvider.initialize("XdeNxntxTKqBv0QvjsZfWdhKxmy74wMeqM4M42p5", "axK8ik0ppHi1smnjsQtTx04buL0M0FNKNKhb7vky");
});
app.run(function(Parse) {
  return Parse.auth.resumeSession();
});
// The bus stop object
app.factory('Stop', function(Parse) {
	var Stop;
	return Stop = (function(_super) {
		__extends(Stop, _super);
		function Stop() {
			return Stop.__super__.constructor.apply(this, arguments);
		}
		// Stop Parse class name and attributes
		Stop.configure('stops', 'stop_code', 'stop_id', 'stop_lat', 'stop_lon', 'stop_latlng', 'stop_name');
		return Stop;
	})(Parse.Model);
});
// The trip object
app.factory('Trip', function(Parse) {
	var Trip;
	return Trip = (function(_super) {
		__extends(Trip, _super);
		function Trip() {
			return Trip.__super__.constructor.apply(this, arguments);
		}
		// Trip Parse class name and attributes
		Trip.configure('trips', 'direction_id', 'route_id', 'shape_id', 'trip_headsign', 'trip_id', 'wheelchair_accessible');
		return Trip;
	})(Parse.Model);
});
// The shape object
app.factory('Shape', function(Parse) {
	var Shape;
	return Shape = (function(_super) {
		__extends(Shape, _super);
		function Shape() {
			return Shape.__super__.constructor.apply(this, arguments);
		}
		// Shape Parse class name and attributes
		Shape.configure('shapes', 'shape_id', 'shape_pt_lat', 'shape_pt_lng', 'shape_pt_sequence');
		return Shape;
	})(Parse.Model);
});
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


function stopCtrl($scope, Stop, mapRoute) {
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
	
	// Get the user's location
	navigator.geolocation.getCurrentPosition(function(position) {
		$scope.location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
		
		// Get the closest bus stop
		Stop.query({
			where: {
				"$nearSphere": {
					"__type": "GeoPoint",
					"latitude": parseFloat($scope.location.lat()),
					"longitude": parseFloat($scope.location.lng())
				}
			},
			limit: 1
		}).then(function(stops) {
			var stop = stops[0];
			$scope.stop = stop;
			// Create a marker for the closest bus stop
			$scope.stop.color = "00FF00";
			$scope.stopMarker = new google.maps.Marker({
				map: $scope.map,
				position: new google.maps.LatLng(stop.stop_lat, stop.stop_lon),
				zIndex: 9999999 // Should appear in front of other markers
			});
		});
	});
	
	
	// Get Bus Stop data
	$scope.stops = [];
	$scope.stopMarkers = [];
	Stop.query({limit: 999999}).then(function(stops) {
		for (var s in stops) {
			// Get the stop object
			var stop = stops[s];
			
			// Create a google maps marker
			var coord = new google.maps.LatLng(stop.stop_lat, stop.stop_lon);
			var marker = new google.maps.Marker({
				map: $scope.map,
				position: coord
			});
			
			// Add it to the list of markers
			$scope.stopMarkers.push(marker);
		}
	});
	
	mapRoute("11954_X94", $scope);
}
