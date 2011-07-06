#!/usr/bin/python

import json
import sys
import xml.dom.minidom

stations_node = xml.dom.minidom.parse(sys.argv[1]).childNodes[0]
stations = []
for station_node in stations_node.childNodes:
    station = {}
    for station_node_prop in station_node.childNodes:
        if len(station_node_prop.childNodes) > 0:
            key = station_node_prop.tagName
            val = station_node_prop.childNodes[0].data
            if val == 'true':
                val = True
            elif val == 'false':
                val = False
            elif val.isdigit():
                val = int(val)
            else:
                try:
                    val2 = float(val)
                    val = val2
                except: 
                    pass
            station[key] = val
    stations.append(station)

print json.dumps({"stations": stations}, separators=(',',':'))
