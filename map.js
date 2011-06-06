function init(minLat, minLon, maxLat, maxLon) {
    var bb = new google.maps.LatLngBounds(new google.maps.LatLng(minLat, minLon),
					  new google.maps.LatLng(maxLat, maxLon));
    var map = new google.maps.Map(document.getElementById("map_canvas"), { zoom: 1, 
									   mapTypeId: google.maps.MapTypeId.ROADMAP,
									   center: bb.getCenter() });

    var bikeLayer = new google.maps.BicyclingLayer();
    bikeLayer.setMap(map);    

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
    
    var locationMarker = new google.maps.Marker({
	map: map,
	visible: false
    });   
    $("#nearby-input").autocomplete(autocomplete);
    $("#find-nearby-button").button();
    $("form#nearby-form").submit(function() {
	$("#nearby-input").blur();
	
	var oldFindButtonVal = $("#find-nearby-button").val();

	$("#find-nearby-button").attr('disabled', 'disabled');
	$("#find-nearby-button").val("Working...");
	geocoder.geocode( {'address': $("#nearby-input").val(), 'bounds': bb }, function(results, status) {
	    $("#find-nearby-button").val(oldFindButtonVal);
	    $("#find-nearby-button").removeAttr('disabled');
	    
	    if (results.length > 0) {
		var latlng = results[0].geometry.location;
		locationMarker.setPosition(latlng);
		locationMarker.setVisible(true);
		map.setCenter(latlng);
		map.setZoom(15);	
	    }
	});

	return false;
    });

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

    $("#tab-selector").buttonset();
    $('input#trip-planner').click(function()  {
	$('div#nearby-panel').hide();
	$('div#trip-planner-panel').show();
    });

    $('input#find-nearby').click(function() {
	$('div#nearby-panel').show();
	$('div#trip-planner-panel').hide();
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

    var imageCanvas = document.createElement("canvas");

    var bixiBounds = new google.maps.LatLngBounds();
    var infoWindow = new google.maps.InfoWindow();
    google.maps.event.addListener(map, 'click', function() {
	infoWindow.close();
    });

    $.ajax({
        type: "GET",
	url: "bikeStations.xml",
	dataType: "xml",
	success: function(xml) {
	    $(xml).find('station').each(function() {

		var numBikes = parseInt($(this).find('nbBikes').text());
		var numEmptyDocks = parseInt($(this).find('nbEmptyDocks').text());
		
		function createIcon(numBikes, numEmptyDocks) {
		    var radius;
		    var alpha;
		    if (numBikes == 0 && numEmptyDocks == 0) {
			// edge case: station with nothing in it
			radius = 5;
			alpha = 0.0;
		    } else {
			radius = (numBikes+numEmptyDocks)/2;
			if (radius > 20) {
			    radius = 10;
			} else if (radius < 5) {
			    radius = 5;
			}

			alpha = numBikes / (numBikes+numEmptyDocks);
			if (alpha > 0.5 && alpha < 1.0) {
			    alpha=0.5;
			} else if (alpha < 0.1 && alpha > 0.0) {
			    alpha = 0.1;
			}
		    }
		    imageCanvas.width = radius*2+4;
		    imageCanvas.height = radius*2+4;
		    var context = imageCanvas.getContext("2d");
		    
		    context.clearRect(0,0,radius*2, radius*2);
		    
		    context.fillStyle = "rgba(255,0,0," + alpha + ")";
		    context.beginPath();
		    context.arc(imageCanvas.width/2,imageCanvas.height/2,radius,0,Math.PI*2,true);
		    context.fill();

		    context.strokeStyle = "#f00";
		    context.beginPath();
		    context.arc(imageCanvas.width/2,imageCanvas.height/2,radius,0,Math.PI*2,true);
		    context.stroke();

		    return imageCanvas.toDataURL();

		}
		var iconURL = createIcon(numBikes, numEmptyDocks);

		var position = new google.maps.LatLng($(this).find('lat').text(),
						      $(this).find('long').text());
		bixiBounds.extend(position);

		var description = "Bikes: " + numBikes + ' - ' + "Docks: " + numEmptyDocks;

		var marker = new google.maps.Marker({
		    position: position, 
		    map: map,
		    icon: iconURL
		});

		google.maps.event.addListener(marker, 'click', function() {		   
		    infoWindow.setContent(description);
		    infoWindow.open(map, marker);
		});

	    });

	    map.fitBounds(bixiBounds);
	}	       
    });
}
