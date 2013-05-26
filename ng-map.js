(function () {
  var app = angular.module('ui.map', []);

  //Setup map events from a google map object to trigger on a given element too,
  //then we just use ui-event to catch events from an element
  function bindMapEvents(scope, eventsStr, googleObject, element) {
    angular.forEach(eventsStr.split(' '), function (eventName) {
      //Prefix all googlemap events with 'map-', so eg 'click' 
      //for the googlemap doesn't interfere with a normal 'click' event
      var $event = { type: 'map-' + eventName };
      google.maps.event.addListener(googleObject, eventName, function (evt) {
        element.triggerHandler(angular.extend({}, $event, evt));
        //We create an $apply if it isn't happening. we need better support for this
        //We don't want to use timeout because tons of these events fire at once,
        //and we only need one $apply
        if (!scope.$$phase) scope.$apply();
      });
    });
  }

  app.directive('uiMap',
    ['uiMapConfig', '$parse', function (uiMapConfig, $parse) {

      var mapEvents = 'bounds_changed center_changed click dblclick drag dragend ' +
        'dragstart heading_changed idle maptypeid_changed mousemove mouseout ' +
        'mouseover projection_changed resize rightclick tilesloaded tilt_changed ' +
        'zoom_changed';
      var options = uiMapConfig || {};

      return {
        restrict: 'A',
        //doesn't work as E for unknown reason
        link: function (scope, elm, attrs) {
          var opts = angular.extend({}, options, scope.$eval(attrs.uiOptions));
          var map = new google.maps.Map(elm[0], opts);
          var model = $parse(attrs.uiMap);

          //Set scope variable for the map
          model.assign(scope, map);

          bindMapEvents(scope, mapEvents, map, elm);
        }
      };
    }]);

  app.value('uiMapInfoWindowConfig', {}).directive('uiMapInfoWindow',
    ['uiMapInfoWindowConfig', '$parse', '$compile', function (uiMapInfoWindowConfig, $parse, $compile) {

      var infoWindowEvents = 'closeclick content_change domready ' +
        'position_changed zindex_changed';
      var options = uiMapInfoWindowConfig || {};

      return {
        link: function (scope, elm, attrs) {
          var opts = angular.extend({}, options, scope.$eval(attrs.uiOptions));
          opts.content = elm[0];
          var model = $parse(attrs.uiMapInfoWindow);
          var infoWindow = model(scope);

          if (!infoWindow) {
            infoWindow = new google.maps.InfoWindow(opts);
            model.assign(scope, infoWindow);
          }

          bindMapEvents(scope, infoWindowEvents, infoWindow, elm);

          /* The info window's contents dont' need to be on the dom anymore,
           google maps has them stored.  So we just replace the infowindow element
           with an empty div. (we don't just straight remove it from the dom because
           straight removing things from the dom can mess up angular) */
          elm.replaceWith('<div></div>');

          //Decorate infoWindow.open to $compile contents before opening
          var _open = infoWindow.open;
          infoWindow.open = function open(a1, a2, a3, a4, a5, a6) {
            $compile(elm.contents())(scope);
            _open.call(infoWindow, a1, a2, a3, a4, a5, a6);
          };
        }
      };
    }]);

  /* 
   * Map overlay directives all work the same. Take map marker for example
   * <ui-map-marker="myMarkerData"> will $watch 'myMarkerData' and each time it changes,
   * it will hook up the marker's events to the directive dom element.  Then
   * ui-event will be able to catch all of myMarker's events. Super simple.
   */
  function mapOverlayDirective(directiveName, events) {
    app.directive(directiveName, [function () {
      return {
        restrict: 'A',
        link: function (scope, elm, attrs) {
          // Create a new map overlay object
          switch(directiveName) {
            case 'uiMapMarker':
              var overlayObject = new google.maps.Marker();
              
              // Watch for changes in position
              var updatePosition = function() {
                var latlng = scope.$eval(attrs['uiLatlng']);
                if (latlng == undefined) {
                  var lat = scope.$eval(attrs['uiLat']);
                  var lng = scope.$eval(attrs['uiLng']);
                  var latlng = new google.maps.LatLng(lat, lng);
                }
                overlayObject.setPosition(latlng);
              };
              scope.$watch(attrs['uiLat'], updatePosition);
              scope.$watch(attrs['uiLng'], updatePosition);
              scope.$watch(attrs['uiLatlng'], updatePosition);
              
              // Update position on marker drag
              google.maps.event.addListener(overlayObject, 'dragend', function() {
                scope[attrs['uiLatlng']] = overlayObject.getPosition();
              });
            
              // Watch for a change in the title
              scope.$watch(attrs['uiTitle'], function(newTitle) {
                overlayObject.setTitle(newTitle);
              });
              
              // Watch for change in icon url
              scope.$watch(attrs['uiIcon'], function(newIcon) {
                if (newIcon !== undefined) {
                  if (attrs['uiIconWidth'] && attrs['uiIconHeight'])
                    var size = new google.maps.Size(attrs['uiIconWidth'], attrs['uiIconHeight']);
                  else
                    var size = new google.maps.Size(15,17);
                  
                  var icon = { url: newIcon, scaledSize: size };
                  overlayObject.setIcon(icon);
                }
              });
              
              break;
            
            case 'uiMapPolyline':
              var overlayObject = new google.maps.Polyline();
              
              // Watch for changes in path
              scope.$watch(attrs['uiPath'], function(newPath) {
                var path = scope.$eval(attrs['uiPath']);
                if (path != undefined)
                  overlayObject.setPath(path);
              });
              
              // Watch for changes in stroke weight
              scope.$watch(attrs['uiWeight'], function(newWeight) {
                overlayObject.setOptions({strokeWeight: newWeight});
              });
              
              break;
          }
          // Remove the overlay object when the directive is destroyed
          scope.$on("$destroy", function() {
            overlayObject.setMap(null);
            overlayObject = null;
          }); 
          
          // Bind map events to the object
          bindMapEvents(scope, events, overlayObject, elm);
          
          // Watch for a change in the map
          scope.$watch(attrs['uiMapName'], function(newMap) {
            overlayObject.setMap(newMap);
          });
          
          // Watch for a change in the overlay data
          scope.$watch(attrs[directiveName], function (newData) {
            if (newData) {
              // Update the overlay object
              overlayObject.setOptions(newData);
            }
          });
          
          // Watch for color change
          scope.$watch(attrs["uiColor"], function (newColor) {
            if (newColor) {
              if (directiveName == "uiMapMarker") {
                var pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + newColor,
                  new google.maps.Size(21, 34),
                  new google.maps.Point(0,0),
                  new google.maps.Point(10, 34));
                var pinShadow = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_shadow",
                  new google.maps.Size(40, 37),
                  new google.maps.Point(0, 0),
                  new google.maps.Point(12, 35));
                
                overlayObject.setIcon(pinImage);
                overlayObject.setShadow(pinShadow);
              } else if (directiveName == "uiMapPolyline") {
                overlayObject.setOptions({strokeColor: newColor});
              }
            }
          });
        }
      };
    }]);
  }

  mapOverlayDirective('uiMapMarker',
    'animation_changed click clickable_changed cursor_changed ' +
      'dblclick drag dragend draggable_changed dragstart flat_changed icon_changed ' +
      'mousedown mouseout mouseover mouseup position_changed rightclick ' +
      'shadow_changed shape_changed title_changed visible_changed zindex_changed');

  mapOverlayDirective('uiMapPolyline',
    'click dblclick mousedown mousemove mouseout mouseover mouseup rightclick');

  mapOverlayDirective('uiMapPolygon',
    'click dblclick mousedown mousemove mouseout mouseover mouseup rightclick');

  mapOverlayDirective('uiMapRectangle',
    'bounds_changed click dblclick mousedown mousemove mouseout mouseover ' +
      'mouseup rightclick');

  mapOverlayDirective('uiMapCircle',
    'center_changed click dblclick mousedown mousemove ' +
      'mouseout mouseover mouseup radius_changed rightclick');

  mapOverlayDirective('uiMapGroundOverlay',
    'click dblclick');

})();