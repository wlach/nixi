var iconCache = {};

function getIcon(freeBikes, emptySlots) {
    var cacheKey = freeBikes + '-' + emptySlots;
    if (iconCache[cacheKey]) {
        return iconCache[cacheKey];
    }

    var imageCanvas, context;
    var radius;
    var alpha;
    if (freeBikes == 0 && emptySlots == 0) {
        // edge case: station with nothing in it
        radius = 5;
        alpha = 0.0;
    } else {
        radius = (freeBikes+emptySlots)/2;
        if (radius > 20) {
            radius = 20;
        } else if (radius < 5) {
            radius = 8;
        }

        alpha = freeBikes / (freeBikes+emptySlots);
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

    iconCache[cacheKey] = imageCanvas.toDataURL();
    return iconCache[cacheKey];
}

$(document).ready(function () {
    var currentNetworkId = null;

    for (var i in networks) {
        $("#network-menu").append('<li><a href="#/networks/' + i + '">' + networks[i].name + '</a></li>');
    }
    $('#network-menu').on('touchstart.dropdown.data-api', function(e) { e.stopPropagation() });

    var bixiStations = [];

    var map;

    var geocoder = new google.maps.Geocoder();
    var bixiBounds;

    function updateDisplay() {
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

            if (currentNetworkId) {
                if (!map) {
                    map = {};
                    map.map = new google.maps.Map(document.getElementById("map"), {
                        zoom: 1,
                        mapTypeId: google.maps.MapTypeId.ROADMAP,
                        center: new google.maps.LatLng(networks[currentNetworkId].latitude,
                                                       networks[currentNetworkId].longitude)
                    });
                    map.map.setZoom(14);

                    map.directionsService = new google.maps.DirectionsService();
                    map.walkingDirectionsDisplay = new google.maps.DirectionsRenderer({
                        markerOptions: { zIndex: google.maps.Marker.MAX_ZINDEX } });
                    map.bikeLayer = new google.maps.BicyclingLayer();
                    map.bikeLayer.setMap(map.map);
                    map.locationMarker = new google.maps.Marker({
                        map: map.map,
                        visible: false
                    });
                    map.infoWindow = new google.maps.InfoWindow();
                    google.maps.event.addListener(map.map, 'click', function() {
                        map.infoWindow.close();
                    });
                }
                // resize map to fit
                google.maps.event.trigger(map.map, "resize");
            }
            $("#map-container").show();
        }
    }

    updateDisplay();

    $(window).resize(function() {
        updateDisplay();
    });

    function updatePlace(placeName) {
        _gaq.push(['_trackPageview', '/find-nearby']);
        $("#nearby-input").val(placeName)
        $("#nearby-input").blur();

        $("#network-hint-widget").hide();
        $("#nearby-error-widget").remove();
        $("#nearby").hide();

        map.walkingDirectionsDisplay.setMap(null);

        var oldFindButtonVal = $("#find-nearby-button").val();

        $("#find-nearby-button").attr('disabled', 'disabled');
        $("#find-nearby-button").val("Working...");
        geocoder.geocode( {'address': placeName, 'bounds': bixiBounds }, function(results, status) {
            $("#find-nearby-button").val(oldFindButtonVal);
            $("#find-nearby-button").removeAttr('disabled');

            if (results.length > 0) {
	        var latlng = results[0].geometry.location;
	        map.locationMarker.setPosition(latlng);
	        map.locationMarker.setVisible(true);
	        map.map.setCenter(latlng);
	        map.map.setZoom(15);

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
	                map.directionsService.route({
	                    origin: latlng,
	                    destination: station.latlng,
	                    travelMode: google.maps.DirectionsTravelMode.WALKING
	                }, function(response, status) {
	                    if (status == google.maps.DirectionsStatus.OK) {
		                map.locationMarker.setVisible(false);
		                map.walkingDirectionsDisplay.setDirections(response);
		                map.walkingDirectionsDisplay.setMap(map.map);
	                    } else {
		                console.log("Error processing directions to station!");
	                    }
	                });
                        e.preventDefault(); // prevent scrolling to top
	            });

	            // Create pie chart

	            if (station.freeBikes == 0 && station.emptySlots == 0) {
	                return;
	            }
	            var data = {
	                items: []
	            };

	            if (station.freeBikes > 0) {
	                data.items[data.items.length] = {label: 'bikes', data: station.freeBikes };
	            } else {
	            }
	            if (station.emptySlots > 0) {
	                data.items[data.items.length] = {label: 'stations', data: station.emptySlots };
	            }

	            var pieChart = new Bluff.Pie('station-graph-' + station.id, '40x40');
	            if (station.freeBikes == 0) {
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

    function updateNetwork(networkId, placeName) {
        localStorage["defaultNetworkId"] = networkId;
        if (networkId === currentNetworkId) {
            if (placeName) {
                updatePlace(placeName);
            }
            return;
        }

        $("#nearby-content").hide();
        $("#nearby-input").val("");

        $("#selected-network").html(networks[networkId].name);
        $.ajax({
            type: "GET",
            url: networkId + ".json",
            dataType: "json",
            success: function(stations) {
                currentNetworkId = networkId;
                updateDisplay();

	        bixiStations = [];
                bixiBounds = new google.maps.LatLngBounds();

                // convert installed station json data into our own format
	        stations.forEach(function(stationDict, i, a) {
	            var station = {
                        id: stationDict.id,
	                name: stationDict.name,
	                freeBikes: stationDict.freeBikes,
	                emptySlots: stationDict.emptySlots,
	                latlng: new google.maps.LatLng(stationDict.latitude,
					               stationDict.longitude),
	            };
	            station.marker = new google.maps.Marker({
	                position: station.latlng,
	                map: map.map,
	                icon: getIcon(station.freeBikes, station.emptySlots)
	            });

	            bixiStations[bixiStations.length] = station;
	            bixiBounds.extend(station.latlng);
	            google.maps.event.addListener(station.marker, 'click', function() {
	                map.infoWindow.setContent("<b>" + station.name +
				                  "</b><br/>Bikes: " +
				                  station.freeBikes + ' - ' +
				                  "Docks: " + station.emptySlots);
	                map.infoWindow.open(map.map, station.marker);
	            });
	        });

                if (placeName) {
                    updatePlace(placeName);
                } else {
	            map.map.setCenter(new google.maps.LatLng(networks[currentNetworkId].latitude,
                                                             networks[currentNetworkId].longitude));
                    document.title = "Nixi Bike Station Finder - " + networks[networkId].name;
                }

	        $("form#nearby-form").unbind();
	        $("form#nearby-form").submit(function() {
                    window.location.hash = '/' + ['networks', currentNetworkId, 'places', $("#nearby-input").val()].join('/');

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

    // get network preference from user and update to it. you might think it
    // would make sense to use geolocation for this, but that's actually
    // kinda slow at least with Firefox
    var networkId = localStorage["defaultNetworkId"];
    if (networkId == undefined) {
        networkId = "bixi-montreal";
        $("#network-hint-widget").show();
    }

    var router = Router({
        '/networks/:networkId': {
            on: function(networkId) {
                updateNetwork(networkId, null);
            },
            '/places/(.+)': {
                on: function(networkId, placeName) {
                    var decodedPlaceName = decodeURI(placeName);
                    updateNetwork(networkId, decodedPlaceName);
                }
            }
        }
    }).configure({ 'notfound': function() { window.location.hash = "/networks/" + networkId; } });

    router.init("/networks/" + networkId);
});

