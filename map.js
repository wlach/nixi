function init(minLat, minLon, maxLat, maxLon) {
    var bb = new google.maps.LatLngBounds(new google.maps.LatLng(minLat, minLon),
					  new google.maps.LatLng(maxLat, maxLon));
    var map = new google.maps.Map(document.getElementById("map_canvas"), { zoom: 6, 
									   mapTypeId: google.maps.MapTypeId.ROADMAP,
									   center: bb.getCenter() });
    var directionsDisplay = new google.maps.DirectionsRenderer();
    directionsDisplay.setMap(map);
    var directionsService = new google.maps.DirectionsService();

    $('body').layout({ defaults: { spacing_open: 0 },
                       applyDefaultStyles: true,
                       west: { size: 320 },
                       north: { innerHeight: 30 },
                       center: { onresize_end: function () { google.maps.event.trigger(map, "resize"); } } });
    map.fitBounds(bb);
    
    var placeService = new google.maps.places.PlacesService(map);

    var geocoder = new google.maps.Geocoder();
    var autocomplete = {
      //This bit uses the geocoder to fetch address values
      source: function(request, response) {
          geocoder.geocode( {'address': request.term, 'bounds': bb }, function(results, status) {
          response($.map(results, function(item) {
            return {
              label: item.formatted_address,
              value: item.formatted_address,
            }
          }));
	  })},
    }
    $("#from-input").autocomplete(autocomplete);
    $("#to-input").autocomplete(autocomplete);    

    $("#plan-button").button();
    $("form#directions-form").submit(function() {
	$('#error-widget').hide();
	$('#from-input').blur();
	$('#to-input').blur();

	var oldPlanButtonVal = $("#plan-button").val();
	
	$("#plan-button").attr('disabled', 'disabled');
	$("#plan-button").val("Working...");

	var request = {
            origin: $("#from-input").val(),
            destination: $("#to-input").val(),
            travelMode: google.maps.DirectionsTravelMode.DRIVING
	};

	directionsService.route(request, function(response, status) {
	    $("#plan-button").removeAttr('disabled');
	    $("#plan-button").val(oldPlanButtonVal);

	    if (status == google.maps.DirectionsStatus.OK) {
		directionsDisplay.setDirections(response);
	    } else {
		$('#error-widget').show();
		console.log("Error processing directions!");
	    }
	});

	return false;
    });

    $("#reverse-button").button({
	text: false, 
	icons: {
	    primary: 'ui-icon-shuffle'
	}
    }).click(function() {
	var fromval = $("#from-input").val();
	$("#from-input").val($("#to-input").val());
	$("#to-input").val(fromval);
    });    
}
