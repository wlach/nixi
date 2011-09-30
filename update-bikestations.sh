#!/bin/bash

cd $(dirname $0)

set -e

function update_city {
    URL=$1
    CITY=$2

    curl -q $URL/bikeStations.xml > bikeStations-$CITY.xml
    ./bxml2json.py bikeStations-$CITY.xml > bikeStations-$CITY.json
}

for CITY in montreal toronto capital; do
    BASEURL=https://$CITY.bixi.com/data

    update_city $BASEURL $CITY
done

# Boston and Washington are different!
update_city http://www.thehubway.com/data/stations boston
update_city http://www.capitalbikeshare.com/stations washington
