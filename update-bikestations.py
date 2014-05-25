#!/usr/bin/env python

from multiprocessing.pool import ThreadPool
import requests
import json

baseurl = 'http://api.citybik.es/v2/networks/'
networkids = [ 'bixi-montreal', 'bixi-toronto', 'capital-bixi', 'hubway',
               'capital-bikeshare', 'citi-bike-nyc', 'barclays-cycle-hire' ]

def process_network(networkid):
    r = requests.get(baseurl + networkid)
    network = json.loads(r.content)['network']

    # output just the stations that are installed, only the metadata we care
    # about
    output_stations = []
    for station in network['stations']:
        # some networks list "uninstalled" stations. don't want those
        if not station['extra'].get('installed') or station['extra']['installed']:
            output_stations.append({'id': station['id'],
                                    'name': station['name'],
                                    'freeBikes': station['free_bikes'],
                                    'emptySlots': station['empty_slots'],
                                    'latitude': station['latitude'],
                                    'longitude': station['longitude']})

    open('%s.json' % networkid, 'w').write(json.dumps(output_stations))

    return network['location']


pool = ThreadPool()
locations = pool.map(process_network, networkids)
with open('locations.js', 'w') as f:
    f.write('var networks = {')
    for (i, networkid) in enumerate(networkids):
        location = locations[i]
        f.write('"%s": { name: "%s", latitude: %s, longitude: %s },' % (
            networkid, location['city'], location['latitude'],
            location['longitude']))

    f.write('};')
