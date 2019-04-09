

const xyzUrl = `https://xyz.api.here.com/hub/spaces/Pqh7dfFY/search?access_token=AJXABoLRYHN488wIHnxheik`

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
         zoom: 11,
         layers: [tangram],
         zoomControl: false
      });
      map.attributionControl.addAttribution('<a href="https://here.xyz">HERE XYZ</a> | <a href="https://www.openstreetmap.org/">OSM</a>');

      console.log(data);

      document.getElementById('sidebar').innerText = 'City of chicago: ' + calculateDistance(data.features) + ' miles of bike lanes'



      const types = new Set(data.features.map(x => x.properties.bikeroute))

      const distances = {};

      types.forEach(q => distances[q] = 0)
      console.log(distances);

      types.forEach(q => console.log(q))

      for (let z = 0; z < data.features.length; z++) {
         const feature = data.features[z];
         const geometry = feature.geometry.coordinates[0];
         const t = feature.properties.bikeroute
         for (let i = 0; i < geometry.length - 1; i++) {
            distances[t] += turf.distance(
               turf.point(geometry[i]),
               turf.point(geometry[i + 1]), {
                  units: 'miles'
               }
            )
         }
      }
      console.log(distances);

      function onMapClick(evt) {
         if (evt.feature) {
            console.log(evt)

            fetch(`https://xyz.api.here.com/hub/spaces/5kwzZmtK/search?access_token=AJXABoLRYHN488wIHnxheik&tags=${evt.feature.id}`)
               .then(res => res.json())
               .then(poly => {


                  let cutDistance = 0;
                  const polyGeo = poly.features[0];
                  console.log(polyGeo)

                  const temp = []

                  data.features.forEach(line => {
                     // console.log(line);
                     const points = turf.points(line.geometry.coordinates[0]);
                     // console.log(points);



                     const within = turf.pointsWithinPolygon(points, polyGeo);
                     // console.log(within);
                     if (within.features.length > 0) {
                        temp.push(within)
                     }
                  })
                  // console.log(cutDistance)

                  // console.log(
                     // temp.map(x => console.log(JSON.stringify(x)))
                  // );

                  const newLines = temp.map(u => {

                     const newLineString = {
                        "type": "Feature",
                        "properties": {},
                        "geometry": {
                           "type": "LineString",
                           "coordinates": [
                              u.features.map(f => f.geometry.coordinates)
                           ]
                        }
                     }


                     return newLineString
                  })
                  console.log(newLines);
                  console.log(calculateDistance(newLines))

                  document.getElementById('sidebar').innerText = polyGeo.properties.pri_neigh + ': ' + calculateDistance(newLines) + ' miles of bike lanes'
               })
         }

      }

      function calculateDistance(features) {
         let distance = 0;
         for (let z = 0; z < features.length; z++) {
            const feature = features[z];
            const geometry = feature.geometry.coordinates[0];
            const t = feature.properties.bikeroute
            for (let i = 0; i < geometry.length - 1; i++) {
               distance += turf.distance(
                  turf.point(geometry[i]),
                  turf.point(geometry[i + 1]), {
                     units: 'miles'
                  }
               )
            }
         }
         return distance
      }

   })
