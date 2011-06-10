This is the source to the "nixi" website, which aims to offer a better web-based
interface to the BIXI web site.

Note that this project uses git submodules to import the Aristo theme. After
cloning you'll want to do this on the command line:

    git submodule init
    git submodule update

Because of modern browser's same origin policies, bike station information needs
to be served up from the same server as that of the app's HTML/Javascript. I
currently use the following script (running as a cron job) to periodically
sync information from the BIXI web site onto the nixi.ca server.

    #!/bin/sh
    
    BASEURL=https://montreal.bixi.com/data
    
    cd $HOME/Sites/nixi
    curl -q -O $BASEURL/bikeStations.xml



