#!/bin/sh

cd $(dirname $0)

set -e

for CITY in montreal toronto capital; do
    BASEURL=https://$CITY.bixi.com/data

    curl -q $BASEURL/bikeStations.xml > bikeStations-$CITY.xml
    ./bxml2json.py bikeStations-$CITY.xml > bikeStations-$CITY.json
done
