var map;
var directionsService;
var bikingDirectionsDisplay;
var walkingDirectionsDisplay;

var cities = [ 
    { name: "Montr&eacute;al",
      url: "bikeStations-montreal.xml"
    },
    { name: "Toronto",
      url: "bikeStations-toronto.xml"
    },
    { name: "Ottawa",
      url: "bikeStations-capital.xml"
    } 
];
	       
var bixiStations = [];
var locationMarker;

function createIcon(numBikes, numEmptyDocks) {
    var imageCanvas, context;
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
	    radius = 8;
	}
	
	alpha = numBikes / (numBikes+numEmptyDocks);
	if (alpha > 0.5 && alpha < 1.0) {
	    alpha=0.5;
	} else if (alpha < 0.1 && alpha > 0.0) {
	    alpha = 0.1;
	}
    }
    
    imageCanvas = document.createElement("canvas");
    context = imageCanvas.getContext("2d");

    imageCanvas.width = radius*2+4;
    imageCanvas.height = radius*2+4;
    
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


function updateCity(cityIndex) {
    var geocoder = new google.maps.Geocoder();

    var bixiBounds = new google.maps.LatLngBounds();
    var infoWindow = new google.maps.InfoWindow();
    google.maps.event.addListener(map, 'click', function() {
	infoWindow.close();
    });

    $.ajax({
        type: "GET",
	url: cities[cityIndex].url,
	dataType: "xml",
	success: function(xml) {
	    $(xml).find('station').each(function() {
		if ($(this).find('installed').text() !== "false") {
		    var station = {};
		    station.name = $(this).find('name').text();
		    station.id = $(this).find('terminalName').text();
		    station.numBikes = parseInt($(this).find('nbBikes').text());
		    station.numEmptyDocks = parseInt($(this).find('nbEmptyDocks').text());
		    station.latlng = new google.maps.LatLng(parseFloat($(this).find('lat').text()),
							    parseFloat($(this).find('long').text()));
		    bixiStations[bixiStations.length] = station;
		    
		    bixiBounds.extend(station.latlng);

		    station.marker = new google.maps.Marker({
			position: station.latlng, 
			map: map,
			icon: createIcon(station.numBikes, station.numEmptyDocks)
		    });
		    
		    google.maps.event.addListener(station.marker, 'click', function() {		   
			infoWindow.setContent("<b>" + station.name + 
					      "</b><br/>Bikes: " + 
					      station.numBikes + ' - ' + 
					      "Docks: " + station.numEmptyDocks);
			infoWindow.open(map, station.marker);
		    });
		}
	    });

	    $("form#nearby-form").unbind();
	    $("form#nearby-form").submit(function() {
		_gaq.push(['_trackPageview', '/find-nearby']);

		$("#city-hint-widget").hide();
		$("#nearby-error-widget").remove();
		$("#nearby").hide();

		$("#nearby-input").blur();
		walkingDirectionsDisplay.setMap(null);
		
		var oldFindButtonVal = $("#find-nearby-button").val();
		
		$("#find-nearby-button").attr('disabled', 'disabled');
		$("#find-nearby-button").val("Working...");
		geocoder.geocode( {'address': $("#nearby-input").val(), 'bounds': bixiBounds }, function(results, status) {
		    $("#find-nearby-button").val(oldFindButtonVal);
		    $("#find-nearby-button").removeAttr('disabled');

		    if (results.length > 0) {
			var latlng = results[0].geometry.location;
			locationMarker.setPosition(latlng);
			locationMarker.setVisible(true);
			map.setCenter(latlng);
			map.setZoom(15);
			
			var nearby_stations = bixiStations.map(function(station) { 
			    var distance = google.maps.geometry.spherical.computeDistanceBetween(latlng, 
												 station.latlng);
			    return jQuery.extend({ distance: parseInt(distance) }, station);
			}).filter(function(station) {
			    return station.distance < 1000;
			}).sort(function(station1, station2) {
			    return station1.distance - station2.distance;
			}).slice(0,5);

			if (nearby_stations.length === 0) {
			    document.title = "No stations within 1000 meters of location. :-(";

			    $("#nearby-panel div.content").prepend(ich.error_widget({
				id: "nearby-error-widget",
				description: document.title
			    }));

			    return false;
			}

			document.title = "Stations near " + results[0].formatted_address;
			$('#nearby-content').replaceWith(ich.stations({ 
			    title: document.title,
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

			$("#nearby").show();
		    } else {
			
			$("#nearby-panel div.content").prepend(ich.error_widget({
			    id: "nearby-error-widget",
			    description: "Unable to find location. Please make sure you are connected to the Internet and double check the wording."
			}));
		    }
		});
		
		return false;
	    });	   

	    var autocomplete = {
		//This bit uses the geocoder to fetch address values
		source: function(request, response) {
		    geocoder.geocode( {'address': request.term, 'bounds': bixiBounds }, function(results, status) {
			response($.map(results.filter(function(item) {
			    return bixiBounds.contains(item.geometry.location);
			}), function(item) {
			    return {
				label: item.formatted_address,
				value: item.formatted_address,
			    }
			}));
		    })},
	    }

	    $("#nearby-input").autocomplete(autocomplete);
	    $("#from-input").autocomplete(autocomplete);
	    $("#to-input").autocomplete(autocomplete);	    

	    $('#map_canvas').show();
	    google.maps.event.trigger(map, "resize");
	    map.fitBounds(bixiBounds);
	}	       
    });
}

function init() {
    $('body').layout({ defaults: { spacing_open: 0 },
                       applyDefaultStyles: true,
                       west: { size: 320 },
                       north: { innerHeight: 30 },
                       center: { onresize_end: function () { google.maps.event.trigger(map, "resize"); } } });

    map = new google.maps.Map(document.getElementById("map_canvas"), {
	zoom: 1, 
	mapTypeId: google.maps.MapTypeId.ROADMAP,
	center: new google.maps.LatLng(45.64, -73.4) 
    });
    var bikeLayer = new google.maps.BicyclingLayer();
    bikeLayer.setMap(map);

    if (!Modernizr.canvas ||
	!Modernizr.localstorage) {
	$('#intro-content p').hide();
	$("#intro-content").prepend(ich.error_widget({
	    id: "unsupported-error-widget",
	    description: "Nixi currently requires a browser that supports advanced HTML5 features. If you can, please upgrade to a modern browser like <a href=\"http://www.mozilla.com/firefox/fx/\">Mozilla Firefox</a> or <a href=\"http://www.google.com/chrome\">Google Chrome</a>. If you can't, sorry. :-("
	}));

	$('#nearby-panel').hide();
	$('#city-selector').hide();
	return;
    }

    for (var i in cities) {
	$("#city-selector").append('<option value= ' + i + '>' + cities[i].name + '</option>');
    }

    bikingDirectionsDisplay = new google.maps.DirectionsRenderer({ map: map });
    walkingDirectionsDisplay = new google.maps.DirectionsRenderer({ markerOptions: { 
	zIndex: google.maps.Marker.MAX_ZINDEX } });
    directionsService = new google.maps.DirectionsService();

    locationMarker = new google.maps.Marker({
	map: map,
	visible: false
    });   

    $("#find-nearby-button").button();
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
		bikingDirectionsDisplay.setDirections(response);
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

    $("#city-selector").change(function() {
	$("#city-hint-widget").hide();
	$("#nearby-error-widget").remove();
	$("#nearby").hide();	
	$("#nearby-input").val("");

	var cityIndex = $("#city-selector").val();
	updateCity(cityIndex);
	localStorage["defaultCityIndex"] = cityIndex;
    });

    // get city preference from user and update to it. you might think it
    // would make sense to use geolocation for this, but that's actually
    // kinda slow at least with Firefox
    var cityIndex = localStorage["defaultCityIndex"];
    if (cityIndex == undefined) {
	cityIndex = 0;
	$("#city-hint-widget").show();
    }
    $("select#city-selector option[value=" + cityIndex + "]").attr("selected", 
								   "selected");

    updateCity(parseInt(cityIndex)); // set city to default
}
