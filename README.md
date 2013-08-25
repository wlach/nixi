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
site's HTML/Javascript. I currently use the 'update-bikestations.sh' script
(running as cron job) to periodically sync information from the BIXI web site
onto the nixi.ca server (converting it to json from xml using a small python
script in the process).

# Credits / Acknowledgements

* Lots of CSS courtesy of the bootstrap library (http://getbootstrap.com)
* Bike image / icon by John Cliff (http://www.openclipart.org/detail/28067)
* Graphs generated using Bluff library (http://bluff.jcoglan.com/)
* Templating done using the ICanHaz library (http://icanhazjs.com/)
