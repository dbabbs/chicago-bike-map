const routesUrl = `https://xyz.api.here.com/hub/spaces/Pqh7dfFY/search?access_token=AJXABoLRYHN488wIHnxheik`;
const neighborhoodsUrl = `https://xyz.api.here.com/hub/spaces/5kwzZmtK/search?access_token=AJXABoLRYHN488wIHnxheik`

const types = ["BIKE LANE", "BUFFERED BIKE LANE", "SHARED-LANE", "PROTECTED BIKE LANE", "OFF-STREET TRAIL", "ACCESS PATH", "NEIGHBORHOOD GREENWAY"]


let map;
async function init() {
   const tangram = Tangram.leafletLayer({ scene: 'scene.yaml' })

   const center = [41.81350459907969, -87.7451178431511]
   map = L.map('map', {
      center: center,
      zoom: 8,
      layers: [tangram],
      zoomControl: false
   });
   map.attributionControl.addAttribution('<a href="https://github.com/tangrams/tangram">Tangram</a> | <a href="https://here.xyz">HERE XYZ</a> | <a href="https://www.openstreetmap.org/">OSM</a> | <a href="loading.io">Loading.io</a>');


   const res = await Promise.all([fetch(routesUrl), fetch(neighborhoodsUrl)]);
   const [routes, neighborhoods] = await Promise.all(res.map(x => x.json()))
   console.log(routes);
   console.log(neighborhoods);


   const neighborhoodStyle = {
      color: '#484848',
      weight: 0,
      opacity: 0,

   }
   L.geoJSON(neighborhoods, {
      style: neighborhoodStyle,
      onEachFeature: (feature, layer) => {
         layer.on({
            click: handleFeatureClick,
         })
         layer.on('mouseover', t => {
            t.target.setStyle({
               'fillColor': 'rgba(250,250,250,.5)'
            });
            handleFeatureClick(t);
         });
         layer.on('mouseout', t => {
            t.target.setStyle({
               'fillColor': ''
            });
         });
      }
   }).addTo(map);

   // map.on('click', (evt) => onMapClick(evt));


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



   const distances = calculateDistance(routes.features, true);
   assignTotals(distances);


   function assignTotals(n) {

      const keys = Object.keys(n).sort((a, b) => n[b] - n[a]).filter(item => item !== 'total');
      keys.unshift('total');
      const max = Object.keys(n).reduce((a, b) => n[a] > n[b] ? a : b);

      for (let i = 0; i < keys.length; i++) {
         document.getElementById(`${keys[i]}-bar`).style.width = (n[keys[i]] / n[max]) * 100 + '%';
         document.getElementById(`${keys[i]}`).style.top = (i * 40) + 'px';

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
         // console.
         // const text = evt.feature.properties.pri_neigh;
         // const popup = L.popup({
         //       className: 'custom',
         //       closeButton: false
         //    })
         //    .setLatLng(evt.leaflet_event.latlng)
         //    .setContent(text)
         //    .openOn(map);
      } else {
         document.getElementById('map').style.cursor = 'auto';
         // map.closePopup();
      }
   }

   function handleFeatureClick(evt) {
      document.getElementById('neighborhood').innerText = evt.target.feature.properties.pri_neigh;
      document.getElementById('loading').style.opacity = '1';


      const polyGeo = evt.target.feature;

      document.getElementById('loading').style.opacity = '0';

      let cutDistance = 0;
      const temp = []

      routes.features.forEach(line => {
         const points = turf.points(line.geometry.coordinates[0]);
         const within = turf.pointsWithinPolygon(points, polyGeo);

         if (within.features.length > 0) {
            within.features.forEach(m => m.properties = line.properties)
            temp.push(within)
         }
      })
      const newLinesForCalc = temp.map(u => {
         return {
            "type": "Feature",
            "properties": u.features[0].properties,
            "geometry": {
               "type": "LineString",
               "coordinates": [u.features.map(f => f.geometry.coordinates)]

            }
         }
      })

      const newLinesAsFeatureCollection = {
         type: 'FeatureCollection',
         features: temp.map(u => {
            return {
               "type": "Feature",
               "properties": u.features[0].properties,
               "geometry": {
                  "type": "LineString",
                  "coordinates": u.features.map(f => f.geometry.coordinates)

               }
            }
         })
      }
      console.log(JSON.stringify(newLinesAsFeatureCollection))
      tangram.scene.setDataSource('_routes', { type: 'GeoJSON', data: newLinesAsFeatureCollection });

      const distances = calculateDistance(newLinesForCalc, true);
      assignTotals(distances)
   }

   function handleNonFeatureClick() {
      const distances = calculateDistance(routes.features, true);
      assignTotals(distances);
      document.getElementById('neighborhood').innerText = 'City of Chicago';
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
