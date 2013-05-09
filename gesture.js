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
	
	// Create cursor and cursor dom element
	var c = zig.controls.Cursor();
	var ce = document.createElement('div');
	ce.id = 'cursor';
	document.body.appendChild(ce);
	 
	// 1. show/hide cursor on session start/end
	zig.singleUserSession.addEventListener('sessionstart', function(focusPosition) {
		ce.style.display = 'block';
	});
	zig.singleUserSession.addEventListener('sessionend', function() {
		ce.style.display = 'none';
	});
	 
	// 2. move the cursor element on cursor move
	c.addEventListener('move', function(cursor) {
		ce.style.left = (c.x * window.innerWidth - (ce.offsetWidth / 2)) + "px";
		ce.style.top = (c.y * window.innerHeight - (ce.offsetHeight / 2)) + "px";
		
		
		// Move the map if the cursor is on the edge of the screen
		var delta = 0.0004;
		var threshold = 0.2;
		var latlng = scope.map.getCenter();
		var lat = latlng.lat();
		var lng = latlng.lng();
		
		if (c.x < threshold)     lng -= delta;
		if (1.0-c.x < threshold) lng += delta;
		if (c.y < threshold)     lat += delta;
		if (1.0-c.y < threshold) lat -= delta;
		
		latlng = new google.maps.LatLng(lat, lng);
		
		scope.map.panTo(latlng);
	});
	 
	// Add cursor to our single user UI session
	zig.singleUserSession.addListener(c);
}