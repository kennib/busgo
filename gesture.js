function enableGestures() {
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
}

$(enableGestures);