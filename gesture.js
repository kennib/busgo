function enableGestures(scope) {
	var mapControlHeight = $("#mapControls").height();
	
	var mapControl = {
		onuserfound: function(user) {
			$("#mapControls").animate({height: mapControlHeight});
		},
		onuserlost: function(user) {
			$("#mapControls").animate({height: "0px"});
		}
	};
	
	zig.addListener(mapControl);
	
	zig.singleUserSession.addEventListener('userengaged', function(user) {
	console.log('User started UI session: ' + user.id);
	});
	zig.singleUserSession.addEventListener('userdisengaged', function(user) {
		console.log('User ended UI session: ' + user.id);
	});
	zig.singleUserSession.addEventListener('sessionstart', function(initialPosition) {
		console.log('Session started at ' + initialPosition);
	});
	zig.singleUserSession.addEventListener('sessionend', function() {
		console.log('Session ended')
	});
	
	// SwipeDetector
	var swipeDetector = zig.controls.SwipeDetector();
	swipeDetector.addEventListener('swipe', function(dir) {
		console.log('SwipeDetector: Swipe direction: ' + dir);
		var delta = 0.005;
		var pos = scope.map.getCenter();
		var lat = pos.lat();
		var lng = pos.lng();
		
		if (dir == "left")  lng -= delta;
		if (dir == "right") lng += delta;
		if (dir == "up")    lat += delta;
		if (dir == "down")  lat -= delta;
		
		scope.map.panTo(new google.maps.LatLng(lat, lng));
	});
	zig.singleUserSession.addListener(swipeDetector);
}