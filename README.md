# About

This is the source to the "nixi" website, which aims to offer a better web-based
user interface to bike share systems across the world.

# How to configure

Due to the same origin policy enforced by web browsers, bike station
information needs to be served up from the same server as that of the main
site's HTML/Javascript. I currently use the 'update-bikestations.py' script
(running as cron job) to periodically sync information from the citybik.es
onto the nixi.ca server.

If you want to develop/test nixi offline, you can do so by loading
"index.html" in your web browser. Note that Chrome refuses to generate
marker images locally for some reason that I haven't determined yet
(everything works fine in Firefox).

# Credits / Acknowledgements

* Lots of CSS courtesy of the bootstrap library (http://getbootstrap.com)
* Bike image / icon by John Cliff (http://www.openclipart.org/detail/28067)
* Graphs generated using Bluff library (http://bluff.jcoglan.com/)
* Templating done using the ICanHaz library (http://icanhazjs.com/)
* Bike station data from Citybik.es (http://citybik.es)
