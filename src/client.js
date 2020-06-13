import Worker from './query.worker';
const ldfetch = require('ldfetch');
const N3 = require('n3');
const Swal = require('sweetalert2');
const wktParser = require('wellknown');
const bbox = require('@turf/bbox').default;
var mapboxgl = require('mapbox-gl/dist/mapbox-gl.js');
mapboxgl.accessToken = 'pk.eyJ1IjoianVsaWFucm9qYXM4NyIsImEiOiJjazk2YTdmNDIwMHc2M2Vtamt1cHRwaDBrIn0.gSdLyC_7GdyVWle6QnAvbg';

var worker = null;
var quadStore = new N3.Store();
var propertyPath = "http://www.geonames.org/ontology#name";
var currentDisplayedItems = [];


window.onload = function () {
  main();
}

async function main() {

  // Load GeoNames ontology
  const fetcher = new ldfetch();
  const quads = (await fetcher.get('http://n076-12.wall1.ilabt.iminds.be/geonames/ontology.rdf')).triples;
  quadStore.addQuads(quads);

  autocomplete(document.getElementById("bar"));
  document.getElementById("bar").addEventListener("input", async function (e) {
    queryAutocompletion(e.target.value);
  });
}

async function queryAutocompletion(searchValue) {
  if (searchValue === "") return;
  prepareForNewQuery();

  worker = new Worker();
  worker.postMessage({
    collection: 'http://n076-12.wall1.ilabt.iminds.be/geonames-suffix-tree/node0.jsonld#Collection',
    treePath: propertyPath,
    query: searchValue
  });

  let arr = [];
  worker.onmessage = e => {
    let filtered = [];
    let set = new Set();

    arr = arr.concat(parseData(e.data));
    arr = arr.sort((a, b) => {
      return b.score - a.score;
    });

    for (let i = 0; i < arr.length; i++) {
      if (filtered.length >= 25) break;
      if (!set.has(arr[i]['@id'])) {
        set.add(arr[i]['@id']);
        filtered.push(arr[i]);
      }
    }

    clearSideBarItems();
    for (let entity of filtered) {
      createCard(entity)
    }
  };
}

function prepareForNewQuery() {
  if (worker) worker.terminate();
  clearSideBarItems();
}

function parseData(res) {
  let entities = new Map();
  let ids = [];
  let results = [];

  for (const r of res) {
    for (const quad of r.object.quads) {
      const s = quad.subject.value;
      const p = quad.predicate.value;
      const o = quad.object.value;

      if (p === propertyPath) {
        ids.push(s);
      }

      if (entities.has(s)) {
        entities.get(s)[p] = o;
      } else {
        entities.set(s, {
          '@id': s,
          [p]: o,
          score: r.score
        });
      }
    }
  }

  for (const id of ids) {
    results.push(entities.get(id));
  }

  return results;
}

async function createCard(item) {
  const codeName = getLabel(item['http://www.geonames.org/ontology#featureCode'], 'http://www.w3.org/2004/02/skos/core#prefLabel', 'en');
  const cardTitle = item[propertyPath];

  addSideBarItem(cardTitle, codeName, item, function (id) { window.open(id) })
}

function getLabel(s, p, lang) {
  for (let q of quadStore.getQuads(s, p)) {
    if (q.object.language === lang) {
      return q.object.value;
    }
  }
}

async function addSideBarItem(title, type, item) {
  let id = item["@id"]
  if (currentDisplayedItems.indexOf(id) !== -1) { return }

  currentDisplayedItems.push(id)

  let sidebarContainer = document.getElementById("autocomplete-items")
  let sidebarItem = document.createElement("div");
  let sidebarItemTitle = document.createElement("h5");
  sidebarItem.className = "sidebarItem";
  sidebarItemTitle.className = "sidebarItemTitle";
  sidebarItemTitle.innerHTML = title;
  sidebarItem.appendChild(sidebarItemTitle);

  const lat = item['http://www.w3.org/2003/01/geo/wgs84_pos#lat'];
  const lon = item['http://www.w3.org/2003/01/geo/wgs84_pos#long'];

  let itemType = document.createElement("p");
  itemType.className = "sidebarItemP";
  itemType.innerHTML = `${type} - ${item['http://www.opengis.net/ont/geosparql#asWKT']} - Similarity: <strong>${Number(item.score).toFixed(3)}</strong>`;
  sidebarItem.appendChild(itemType);


  sidebarItem.addEventListener('click', () => {

    Swal.fire({
      title: `<strong><a href="${id}" target="_blank">${title}</a></strong>`,
      html: `<div style="height: inherit" id="map_${id}"></div>`,
      showCloseButton: true,
      showConfirmButton: false
    });

    let map = new mapboxgl.Map({
      container: `map_${id}`,
      style: 'mapbox://styles/mapbox/light-v10',
      center: [lon, lat],
      zoom: 15
    });
    map.addControl(new mapboxgl.NavigationControl());

    var popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <strong>Id:</strong> <a href="${id}" target="_blank">${id}</a>
      <strong>Name: </strong><span>${title}</span><br/>
      <strong>Type: </strong><span>${type}</span><br/>
      <strong>Latitude: </strong><span>${lat}</span><br/>
      <strong>Longitude: </strong><span>${lon}</span>

    `);

    new mapboxgl.Marker()
      .setLngLat([lon, lat])
      .setPopup(popup)
      .addTo(map);

    const wkt = item['http://www.opengis.net/ont/geosparql#asWKT'];

    if (wkt.includes('POLYGON')) {
      const geojson = wktParser(wkt);
      const bb = bbox(geojson);

      map.on('load', function () {
        map.addSource('polyS', {
          'type': 'geojson',
          'data': {
            'type': 'Feature',
            'geometry': geojson
          }
        });
        map.addLayer({
          'id': 'polyL',
          'type': 'fill',
          'source': 'polyS',
          'layout': {},
          'paint': {
            'fill-color': '#088',
            'fill-opacity': 0.8
          }
        });
        map.fitBounds(bb, { padding: 20 });
      });
    }

  });

  sidebarContainer.appendChild(sidebarItem);
}

function clearSideBarItems() {
  currentDisplayedItems = []
  let sidebarContainer = document.getElementById("autocomplete-items")
  sidebarContainer.innerHTML = "";
}

function autocomplete(inp, field) {
  /*the autocomplete function takes two arguments,
  the text field element and an array of possible autocompleted values:*/
  var currentFocus = -1;
  /*execute a function presses a key on the keyboard:*/
  inp.addEventListener("keydown", function (e) {
    var x = document.getElementById("autocomplete-items");
    if (x) x = x.getElementsByTagName("div");
    if (e.keyCode == 40) {
      /*If the arrow DOWN key is pressed,
        increase the currentFocus variable:*/
      currentFocus++;
      /*and and make the current item more visible:*/
      addActive(x);
    } else if (e.keyCode == 38) {
      //up
      /*If the arrow UP key is pressed,
        decrease the currentFocus variable:*/
      currentFocus--;
      /*and and make the current item more visible:*/
      addActive(x);
    } else if (e.keyCode == 13) {
      /*If the ENTER key is pressed, prevent the form from being submitted,*/
      e.preventDefault();
      if (currentFocus > -1) {
        /*and simulate a click on the "active" item:*/
        if (x) x[currentFocus].click();
      }
    }
  });
  function addActive(x) {
    /*a function to classify an item as "active":*/
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = x.length - 1;
    /*add class "autocomplete-active":*/
    x[currentFocus].classList.add("autocomplete-active");
  }
  function removeActive(x) {
    /*a function to remove the "active" class from all autocomplete items:*/
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
  }
  function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document,
    except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }
  /*execute a function when someone clicks in the document:*/
  document.addEventListener("click", function (e) {
    closeAllLists(e.target);
  });
}

