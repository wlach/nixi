function init(minLat, minLon, maxLat, maxLon) {
    var bb = new google.maps.LatLngBounds(new google.maps.LatLng(minLat, minLon),
					  new google.maps.LatLng(maxLat, maxLon));
    var map = new google.maps.Map(document.getElementById("map_canvas"), { zoom: 1, 
									   mapTypeId: google.maps.MapTypeId.ROADMAP,
									   center: bb.getCenter() });

    var bikeLayer = new google.maps.BicyclingLayer();
    bikeLayer.setMap(map);    

    var directionsDisplay = new google.maps.DirectionsRenderer({ map: map });
    var walkingDirectionsDisplay = new google.maps.DirectionsRenderer({ markerOptions: { 
	zIndex: google.maps.Marker.MAX_ZINDEX } });

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
            travelMode: google.maps.DirectionsTravelMode.BICYCLING
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
	    var stations = [];

	    $(xml).find('station').each(function() {
		var station = {};
		station.name = $(this).find('name').text();
		station.id = $(this).find('terminalName').text();
		station.numBikes = parseInt($(this).find('nbBikes').text());
		station.numEmptyDocks = parseInt($(this).find('nbEmptyDocks').text());
		station.latlng = new google.maps.LatLng(parseFloat($(this).find('lat').text()),
							parseFloat($(this).find('long').text()));
		stations[stations.length] = station;

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
			    radius = 20;
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
		var iconURL = createIcon(station.numBikes, station.numEmptyDocks);

		bixiBounds.extend(station.latlng);

		station.marker = new google.maps.Marker({
		    position: station.latlng, 
		    map: map,
		    icon: iconURL
		});

		google.maps.event.addListener(station.marker, 'click', function() {		   
		    infoWindow.setContent("<b>" + station.name + 
					  "</b><br/>Bikes: " + 
					  station.numBikes + ' - ' + 
					  "Docks: " + station.numEmptyDocks);
		    infoWindow.open(map, station.marker);
		});

	    });

	    $("form#nearby-form").submit(function() {
		$("#nearby-input").blur();
		walkingDirectionsDisplay.setMap(null);

		var oldFindButtonVal = $("#find-nearby-button").val();
		
		$("#find-nearby-button").attr('disabled', 'disabled');
		$("#find-nearby-button").val("Working...");
		geocoder.geocode( {'address': $("#nearby-input").val(), 'bounds': bb }, function(results, status) {
		    $("#find-nearby-button").val(oldFindButtonVal);
		    $("#find-nearby-button").removeAttr('disabled');

		    var nearbyHTML = "";
		    
		    if (results.length > 0) {
			var latlng = results[0].geometry.location;
			locationMarker.setPosition(latlng);
			locationMarker.setVisible(true);
			map.setCenter(latlng);
			map.setZoom(15);
			
			var nearby_stations = stations.map(function(station) { 
			    var distance = google.maps.geometry.spherical.computeDistanceBetween(latlng, 
												 station.latlng);
			    return jQuery.extend({ distance: parseInt(distance) }, station);
			}).filter(function(station) {
			    return station.distance < 1000;
			}).sort(function(station1, station2) {
			    return station1.distance > station2.distance;
			}).slice(0,5);

			$('#nearby-content').replaceWith(ich.stations({ 
			    location: results[0].formatted_address,
			    stations: nearby_stations }));

			nearby_stations.map(function(station) {
			    $('#station-' + station.id).hover(function() {
				$(this).addClass("nearby-station-hover");
			    }, function() {
				$(this).removeClass("nearby-station-hover");
			    }).click(function() {
				$('.nearby-station').removeClass("nearby-station-selected");
				$(this).addClass("nearby-station-selected");
				directionsService.route({
				    origin: latlng,
				    destination: station.latlng,
				    travelMode: google.maps.DirectionsTravelMode.WALKING
				}, function(response, status) {
				    if (status == google.maps.DirectionsStatus.OK) {
					locationMarker.setVisible(false);
					walkingDirectionsDisplay.setDirections(response);
					walkingDirectionsDisplay.setMap(map);
				    } else {
					console.log("Error processing directions to station!");
				    }
				});

			    });

			    // Create pie chart

			    if (station.numBikes == 0 && station.numEmptyDocks == 0) {
				return;
			    }
			    console.log(station.numBikes + "-" + station.numEmptyDocks);
			    var data = {
				items: []
			    };

			    if (station.numBikes > 0) {
				data.items[data.items.length] = {label: 'bikes', data: station.numBikes };
			    } else {
			    }
			    if (station.numEmptyDocks > 0) {
				data.items[data.items.length] = {label: 'stations', data: station.numEmptyDocks };
			    }

			    var pieChart = new Bluff.Pie('station-graph-' + station.id, '40x40');
			    if (station.numBikes == 0) {
				pieChart.set_theme({
				    colors: ['#fbb' ],
				    background_colors: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)']
				});
			    } else {
				pieChart.set_theme({
				    colors: ['#f00', '#fbb' ],
				    background_colors: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)']
				});
			    }
	
			    pieChart.hide_labels_less_than = 100;
			    pieChart.hide_legend = true;
			    for (i in data.items) {
				var item = data.items[i];
				pieChart.data(item.label, item.data);
			    }

			    pieChart.draw();
			});
		    }
		});
		
		return false;
	    });

	    map.fitBounds(bixiBounds);
	}	       
    });

/*
    var data = {
	items: [{label: 'bikes', data: 12015},
		{label: 'stations', data: 124689}]
    };
    //Create pie chart
    var pieChart = new Bluff.Pie('example', '40x40');
    pieChart.set_theme({
	colors: ['#f00', '#fbb' ],
	background_colors: ['#fff', '#fff']
    });
	
    pieChart.hide_labels_less_than = 100;
    pieChart.hide_legend = true;
    for (i in data.items) {
	var item = data.items[i];
	//Add each data item to pie
	pieChart.data(item.label, item.data);
    }
    //Finally draw the chart
    pieChart.draw();


    //Create pie chart
    var pieChart = new Bluff.Pie('example', '40x40');
    pieChart.set_theme({
	colors: ['#f00', '#fbb' ],
	background_colors: ['#fff', '#fff']
    });
	
    pieChart.hide_labels_less_than = 100;
    pieChart.hide_legend = true;
    for (i in data.items) {
	var item = data.items[i];
	//Add each data item to pie
	pieChart.data(item.label, item.data);
    }
    //Finally draw the chart
    pieChart.draw();
*/
}
