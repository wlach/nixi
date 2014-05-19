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

$(document).ready(function () {
  var cities = {
    "montreal": { name: "Montr&eacute;al",
                  url: "bixi-montreal.json"
                },
    "toronto": { name: "Toronto",
                 url: "bixi-toronto.json"
               },
    "ottawa": { name: "Ottawa",
                url: "capital-bixi.json"
              },
    "boston": { name: "Boston",
                url: "hubway.json"
              },
    "washington": { name: "Washington",
                    url: "capital-bikeshare.json"
                  }
  };

  var currentCityId = null;

  for (var i in cities) {
    $("#city-menu").append('<li><a href="#/cities/' + i + '">' + cities[i].name + '</a></li>');
  }
  $('#city-menu').on('touchstart.dropdown.data-api', function(e) { e.stopPropagation() });

  var bixiStations = [];

  var map = new google.maps.Map(document.getElementById("map"), {
    zoom: 1,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    center: new google.maps.LatLng(45.64, -73.4)
  });
  map.setZoom(15);

  var bikeLayer = new google.maps.BicyclingLayer();
  bikeLayer.setMap(map);

  var directionsService = new google.maps.DirectionsService();
  var walkingDirectionsDisplay = new google.maps.DirectionsRenderer({ markerOptions: {
    zIndex: google.maps.Marker.MAX_ZINDEX } });
  var locationMarker = new google.maps.Marker({
    map: map,
    visible: false
  });

  var geocoder = new google.maps.Geocoder();
  var bixiBounds;
  var infoWindow = new google.maps.InfoWindow();
  google.maps.event.addListener(map, 'click', function() {
    infoWindow.close();
  });

  function updateDimensions() {
    $("#sidebar").show();

    if ($(window).width() < 800) {
      // just the "sidebar" (no map)
      $("#map-container").hide();
      $("#sidebar").toggleClass("sidebar-fixed", false);
      $("#sidebar").toggleClass("sidebar-full", true);
      $("#sidebar").height(null);
    } else {
      // sidebar + map
      $("#sidebar").toggleClass("sidebar-fixed", true);
      $("#sidebar").toggleClass("sidebar-full", false);

      $("#sidebar").height($(window).height() - 60);
      $("#map-container").height($(window).height() - 40);
      $("#map-container").width($(window).width() - $("#sidebar").width() - 40);
      // resize map to fit
      google.maps.event.trigger(map, "resize");
      $("#map-container").show();
    }
  }

  updateDimensions();

  $(window).resize(function() {
    updateDimensions();
  });

  function updatePlace(placeName) {
    _gaq.push(['_trackPageview', '/find-nearby']);
    $("#nearby-input").val(placeName)
    $("#nearby-input").blur();

    $("#city-hint-widget").hide();
    $("#nearby-error-widget").remove();
    $("#nearby").hide();

    walkingDirectionsDisplay.setMap(null);

    var oldFindButtonVal = $("#find-nearby-button").val();

    $("#find-nearby-button").attr('disabled', 'disabled');
    $("#find-nearby-button").val("Working...");
    geocoder.geocode( {'address': placeName, 'bounds': bixiBounds }, function(results, status) {
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
	  }, function() {
	  }).click(function(e) {
	    $('.nearby-station').removeClass("active");
	    $(this).addClass("active");
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
            e.preventDefault(); // prevent scrolling to top
	  });

	  // Create pie chart

	  if (station.numBikes == 0 && station.numEmptyDocks == 0) {
	    return;
	  }
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

    $("#nearby-input").show();

    return false;
  }

  function updateCity(cityId) {
    if (cityId === currentCityId) {
      return;
    }
    currentCityId = cityId;

    $("#selected-city").html(cities[cityId].name);

    $.ajax({
      type: "GET",
      url: cities[cityId].url,
      dataType: "json",
      success: function(network) {
        var network = network.network;

	bixiStations = [];
        bixiBounds = new google.maps.LatLngBounds();

        // convert installed station json data into our own format
	network.stations.forEach(function(stationDict, i, a) {
	  if (stationDict.extra.installed) {
	    var station = {
	      id: stationDict.id,
	      name: stationDict.name,
	      numBikes: stationDict.free_bikes,
	      numEmptyDocks: stationDict.empty_slots,
	      latlng: new google.maps.LatLng(stationDict.latitude,
					     stationDict.longitude),
	    };
	    station.marker = new google.maps.Marker({
	      position: station.latlng,
	      map: map,
	      icon: createIcon(station.numBikes, station.numEmptyDocks)
	    });

	    bixiStations[bixiStations.length] = station;
	    bixiBounds.extend(station.latlng);
	    google.maps.event.addListener(station.marker, 'click', function() {
	      infoWindow.setContent("<b>" + station.name +
				    "</b><br/>Bikes: " +
				    station.numBikes + ' - ' +
				    "Docks: " + station.numEmptyDocks);
	      infoWindow.open(map, station.marker);
	    });
	  }
	});

	map.fitBounds(bixiBounds);

	$("form#nearby-form").unbind();
	$("form#nearby-form").submit(function() {
            window.location.hash = '/' + ['cities', currentCityId, 'places', $("#nearby-input").val()].join('/');

          return false;
	});

        $("#nearby-input").typeahead({
          source: function (query, process) {
	    geocoder.geocode({'address': query, 'bounds': bixiBounds },
                             function(results, status) {
                               var results = $.map(results.filter(function(item) {
			         return bixiBounds.contains(item.geometry.location);
			       }), function(item) {
			         return item.formatted_address;
                               });
                               return process(results);
                             });
          },
          matcher: function(query) {
            return isNaN(query); // by definition true if we have more than a number
          }
        });
      }
    });
  }

  // get city preference from user and update to it. you might think it
  // would make sense to use geolocation for this, but that's actually
  // kinda slow at least with Firefox
  var cityId = localStorage["defaultCityId"];
  if (cityId == undefined) {
    cityId = "montreal";
    $("#city-hint-widget").show();
  }

  var router = Router({
    '/cities/:cityId': {
      on: function(cityId) {
        localStorage["defaultCityId"] = cityId;
        updateCity(cityId);
      },
      '/places/(.+)': {
        on: function(cityId, placeName) {
          var decodedPlaceName = decodeURI(placeName);
          updatePlace(decodedPlaceName);
        }
      }
    }
  }).configure({ recurse: "forward" });

  router.init("/cities/" + cityId);
});
