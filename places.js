function placesCtrl($scope, $routeParams, $timeout, Stop, directions) {
	// Page attributes
	$scope.placesLink = "places";
	$scope.mapLink = "map";
	$scope.busesLink = "buses";
	
	// Radius of search results in metres
	$scope.radius = 1000;
	
	// List of types of places
	$scope.validTypes = ['accounting','airport','amusement_park','aquarium','art_gallery','atm','bakery','bank','bar','beauty_salon','bicycle_store','book_store','bowling_alley','bus_station','cafe','campground','car_dealer','car_rental','car_repair','car_wash','casino','cemetery','church','city_hall','clothing_store','convenience_store','courthouse','dentist','department_store','doctor','electrician','electronics_store','embassy','establishment','finance','fire_station','florist','food','funeral_home','furniture_store','gas_station','general_contractor','grocery_or_supermarket','gym','hair_care','hardware_store','health','hindu_temple','home_goods_store','hospital','insurance_agency','jewelry_store','laundry','lawyer','library','liquor_store','local_government_office','locksmith','lodging','meal_delivery','meal_takeaway','mosque','movie_rental','movie_theater','moving_company','museum','night_club','painter','park','parking','pet_store','pharmacy','physiotherapist','place_of_worship','plumber','police','post_office','real_estate_agency','restaurant','roofing_contractor','rv_park','school','shoe_store','shopping_mall','spa','stadium','storage','store','subway_station','synagogue','taxi_stand','train_station','travel_agency','university','veterinary_care','zoo'];
	$scope.mainTypes = ['food', 'bar', 'atm', 'bus_station', 'train_station'];
	
	// Function to set types
	$scope.setTypes = function() {
		$scope.types = Array.prototype.slice.call(arguments, 0);
	};
	
	
	// Get the user's location
	if ($routeParams.stopId) {
		// Update links
		$scope.mapLink = "map?stop="+$routeParams.stopId;
		$scope.busesLink = "buses/stop/"+$routeParams.stopId;
		
		// Use URL route parameter to find a stop
		Stop.query({
			where: JSON.stringify({
				stop_id: $routeParams.stopId
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
	
	// Update places based on location, type or search change
	$scope.$watch('location', placeSearch);
	$scope.$watch('types', placeSearch);
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
				radius: $scope.radius,
				types: $scope.types
			};
			
			placesService.textSearch(search, updatePlaces);
		} else if ($scope.location) {
			// If we only have a location
			var search = {
				location: $scope.location,
				radius: $scope.radius,
				types: $scope.types
			};
			
			placesService.nearbySearch(search, updatePlaces);
		}
	}
	
	// Get the directions from the Google directions service
	$scope.travelModes = ["TRANSIT", "WALKING"];
	$scope.getDirections = function(place) {
		// Reset directions
		place.dirs = {};
		// Get directions for each mode of travel
		for (var m in $scope.travelModes) {
			var mode = $scope.travelModes[m];
			var dirs = directions({
				origin: $scope.location,
				destination: place.geometry.location,
				travelMode: google.maps.TravelMode[mode]
			}, function() {
				place.hasDirections = true;
				$scope.$apply();
			}, true);
			place.dirs[mode] = dirs;
		}
	};
}
