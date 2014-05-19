#!/bin/bash

cd $(dirname $0)

set -e

for NETWORK in bixi-montreal bixi-toronto capital-bixi hubway capital-bikeshare; do
curl -q http://api.citybik.es/v2/networks/$NETWORK > $NETWORK.json
done
