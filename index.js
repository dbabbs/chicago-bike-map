const xyzUrl = `https://xyz.api.here.com/hub/spaces/Pqh7dfFY/search?access_token=AJXABoLRYHN488wIHnxheik`;
const types = ["BIKE LANE", "BUFFERED BIKE LANE", "SHARED-LANE", "PROTECTED BIKE LANE", "OFF-STREET TRAIL", "ACCESS PATH", "NEIGHBORHOOD GREENWAY"]
let map;
async function init() {
   const tangram = Tangram.leafletLayer({
      scene: 'scene.yaml',
      events: {
         click: onMapClick,
         hover: onMapHover
      }
   })
   const center = [41.81350459907969, -87.7451178431511]
   map = L.map('map', {
      center: center,
      zoom: 8,
      layers: [tangram],
      zoomControl: false
   });
   map.attributionControl.addAttribution('<a href="https://github.com/tangrams/tangram">Tangram</a> | <a href="https://here.xyz">HERE XYZ</a> | <a href="https://www.openstreetmap.org/">OSM</a> | <a href="loading.io">Loading.io</a>');

   const response = await fetch(xyzUrl);
   const data = await response.json();
   document.getElementById('loading').style.opacity = '0';
   // tangram.scene.subscribe({
   //    load: (scene) => {
   //       console.log('h')
   //       document.getElementById('loading').style.opacity = '0';
   //    }
   // })

   map.flyTo(center, 11, {
      animate: true,
      duration: 0.5
   })



   const distances = calculateDistance(data.features, true);
   assignTotals(distances);


   function assignTotals(n) {

      const keys = Object.keys(n).sort((a,b) => n[b]- n[a])
      // keys.forEach(key => console.log(`${key}: ${n[key]}`))
      const max = Object.keys(n).reduce((a, b) => n[a] > n[b] ? a : b);

      for (let i = 0; i < keys.length; i++) {

         console.log(`${keys[i]}: ${n[keys[i]]}`)
         // document.getElementById(keys[i]).style.order = i;
         document.getElementById(`${keys[i]}-bar`).style.width = (n[keys[i]] / n[max]) * 100 + '%';
         document.getElementById(`${keys[i]}`).style.top = (i * 40) + 'px';
         // console.log(document.getElementById(`${keys[i]}`).style.top)
         document.getElementById(`${keys[i]}-text`).innerText = '(' + (Math.round(n[keys[i]] * 100) / 100) + ' miles)';
         if (n[keys[i]] === 0) {
            document.getElementById(`${keys[i]}-bar`).style.width = '0%';

            document.getElementById(`${keys[i]}-text`).innerText = '(0 miles)';
         }
      }
   }

   function onMapHover(evt) {
      if (evt.feature) {
         document.getElementById('map').style.cursor = 'pointer';

         const text = evt.feature.properties.pri_neigh;
         const popup = L.popup({className: 'custom', closeButton: false})
         .setLatLng(evt.leaflet_event.latlng)
         .setContent(text)
         .openOn(map);
      } else {
         document.getElementById('map').style.cursor = 'auto';
         map.closePopup();
      }
   }

   async function onMapClick(evt) {
      if (evt.feature) {

         tangram.scene.config.layers.neighborhoods0.filter.pri_neigh = evt.feature.properties.pri_neigh;
         console.log(tangram.scene.config.layers.neighborhoods0.filter.pri_neigh)
         const neighborhood = evt.feature.properties.pri_neigh;

         document.getElementById('neighborhood').innerText = neighborhood;

         document.getElementById('loading').style.opacity = '1';
         const response = await fetch(`https://xyz.api.here.com/hub/spaces/5kwzZmtK/search?access_token=AJXABoLRYHN488wIHnxheik&tags=${evt.feature.id}`);
         const poly = await response.json();
         document.getElementById('loading').style.opacity = '0';

         let cutDistance = 0;
         const polyGeo = poly.features[0];
         const temp = []

         data.features.forEach(line => {
            const points = turf.points(line.geometry.coordinates[0]);
            const within = turf.pointsWithinPolygon(points, polyGeo);

            if (within.features.length > 0) {
               within.features.forEach(m => m.properties = line.properties)
               temp.push(within)
            }
         })
         const newLines = temp.map(u => {
            const newLineString = {
               "type": "Feature",
               "properties": u.features[0].properties,
               "geometry": {
                  "type": "LineString",
                  "coordinates": [
                     u.features.map(f => f.geometry.coordinates)
                  ]
               }
            }
            return newLineString
         })
         const distances = calculateDistance(newLines, true);
         console.log(distances);
         assignTotals(distances)
      } else {
         const distances = calculateDistance(data.features, true);
         assignTotals(distances);
         document.getElementById('neighborhood').innerText = 'City of Chicago';

      }
   }

   function calculateDistance(features, all = false) {
      let distance = 0;
      const distances = {};

      types.forEach(q => distances[q] = 0);
      distances['total'] = 0;

      for (let z = 0; z < features.length; z++) {
         const feature = features[z];
         const geometry = feature.geometry.coordinates[0];
         const t = feature.properties.bikeroute
         for (let i = 0; i < geometry.length - 1; i++) {
            if (all) {
               distances[t] += turf.distance(
                  turf.point(geometry[i]),
                  turf.point(geometry[i + 1]), {
                     units: 'miles'
                  }
               )
               distances['total'] += turf.distance(
                  turf.point(geometry[i]),
                  turf.point(geometry[i + 1]), {
                     units: 'miles'
                  }
               )
            } else {
               distance += turf.distance(
                  turf.point(geometry[i]),
                  turf.point(geometry[i + 1]), {
                     units: 'miles'
                  }
               )
            }
         }
      }
      return all ? distances : distance;
   }

}



init();
