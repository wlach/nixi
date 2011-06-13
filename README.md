# About

This is the source to the "nixi" website, which aims to offer a better web-based
interface to the BIXI web site.

# How to configure

Note that this project uses git submodules to import the Aristo theme. After
cloning you'll want to do this on the command line:

    git submodule init
    git submodule update

If you want to develop/test nixi offline, you can do so by loading 
"index.html" in your web browser. Note that Chrome refuses to generate
marker images locally for some reason that I haven't determined yet 
(everything works fine in Firefox).

Due to the same origin policy enforced by web browsers, bike station
information needs to be served up from the same server as that of the main
site's HTML/Javascript. I currently use the following script (running as a
cron job) to periodically sync information from the BIXI web site onto the
nixi.ca server.

    #!/bin/sh
    
    cd $HOME/Sites/nixi
    
    for CITY in montreal toronto capital; do
        BASEURL=https://$CITY.bixi.com/data
    
        curl -q $BASEURL/bikeStations.xml > bikeStations-$CITY.xml
    done

# Credits / Acknowledgements

* Base stylesheet originally by Francis Wu (http://thisisfranciswu.com/)
* Bike image / icon by John Cliff (http://www.openclipart.org/detail/28067)
* Graphs generated using Bluff library (http://bluff.jcoglan.com/)
* Templating done using the ICanHaz library (http://icanhazjs.com/)
* Layout is generated using UI.Layout (http://layout.jquery-dev.net/)

