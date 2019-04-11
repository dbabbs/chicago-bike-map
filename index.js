const xyzUrl = `https://xyz.api.here.com/hub/spaces/Pqh7dfFY/search?access_token=AJXABoLRYHN488wIHnxheik`;

const types = ["BIKE LANE", "BUFFERED BIKE LANE", "SHARED-LANE", "PROTECTED BIKE LANE", "OFF-STREET TRAIL", "ACCESS PATH", "NEIGHBORHOOD GREENWAY"]

fetch(xyzUrl)
   .then(res => res.json())
   .then(data => {

      const tangram = Tangram.leafletLayer({
         scene: 'scene.yaml',
         events: {
            click: onMapClick
         }
      })
      const map = L.map('map', {
         center: [41.881832, -87.623177],
         zoom: 5,
         layers: [tangram],
         zoomControl: false
      });
      map.attributionControl.addAttribution('<a href="https://github.com/tangrams/tangram">Tangram</a> | <a href="https://here.xyz">HERE XYZ</a> | <a href="https://www.openstreetmap.org/">OSM</a>');
      map.flyTo([41.881832, -87.623177], 11, {
         animate: true,
         duration: 1
      })

      const distances = calculateDistance(data.features, true);
      assignTotals(distances);
      // map.on('click', () => assignTotals(distances, true))




      function assignTotals(n) {

         delete n['total']
         const keys = Object.keys(n);
         const max = Object.keys(n).reduce((a, b) => n[a] > n[b] ? a : b);

         for (let i = 0; i < keys.length; i++) {
            document.getElementById(keys[i]).style.order = i;
            document.getElementById(`${keys[i]}-bar`).style.width = (n[keys[i]] / n[max]) * 100 + '%';
            console.log(document.getElementById(`${keys[i]}-text`))
            document.getElementById(`${keys[i]}-text`).innerText = Math.round(n[keys[i]] * 100) / 100 + ' miles';

         }
      }

      function onMapClick(evt) {
         if (evt.feature) {
            fetch(`https://xyz.api.here.com/hub/spaces/5kwzZmtK/search?access_token=AJXABoLRYHN488wIHnxheik&tags=${evt.feature.id}`)
               .then(res => res.json())
               .then(poly => {


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
               })
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

   })
