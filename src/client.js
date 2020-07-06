const treeBrowser = require("rdf_tree_browser");
const normalize = treeBrowser.Normalizer.normalize;
const ldfetch = require('ldfetch');
const N3 = require('n3');
const Swal = require('sweetalert2');
const wktParser = require('wellknown');
const bbox = require('@turf/bbox').default;
var mapboxgl = require('mapbox-gl/dist/mapbox-gl.js');
mapboxgl.accessToken = 'pk.eyJ1IjoianVsaWFucm9qYXM4NyIsImEiOiJjazk2YTdmNDIwMHc2M2Vtamt1cHRwaDBrIn0.gSdLyC_7GdyVWle6QnAvbg';

var acClient = null;
var quadStore = new N3.Store();
var osmPP = ["https://w3id.org/openstreetmap/terms#name"];
var geonamesPP = ["http://www.geonames.org/ontology#name"];
var sv = null;


window.onload = function () {
  main();
}

async function main() {

  // Load GeoNames and OSM ontologies
  const fetcher = new ldfetch();
  const [osm, geonames] = await Promise.all([
    fetcher.get('https://w3id.org/openstreetmap/terms'),
    fetcher.get('http://193.190.127.152/geonames/ontology.rdf')
  ]);
  quadStore.addQuads(osm.triples);
  quadStore.addQuads(geonames.triples);

  autocomplete(document.getElementById("bar"));
  document.getElementById("bar").addEventListener("input", async function (e) {
    sv = e.target.value;
    queryAutocompletion(e.target.value);
  });
}

var currentDisplayedItems = []

async function queryAutocompletion(searchValue) {
  if (searchValue === "") return;
  prepareForNewQuery(searchValue);

  const geonamesTree = 'http://193.190.127.152/geonames-prefix-tree/node0.jsonld#Collection';
  const osmTree = 'http://193.190.127.152/osm-prefix-tree/node0.jsonld#Collection'

  if (acClient) acClient.interrupt();
  acClient = new treeBrowser.AutocompleteClient(false);
  acClient.on("data", data => {
    data.jsonld.query = searchValue.trim();
    createCard(data.jsonld);
    /*let dataEntities = parseData(data);
    for (let entity of dataEntities) {
      createCard(entity)
    }*/
  });
  acClient.query(searchValue.trim(), treeBrowser.PrefixQuery, geonamesPP, geonamesTree, 25);
  acClient.query(searchValue.trim(), treeBrowser.PrefixQuery, osmPP, osmTree, 25);
}

function prepareForNewQuery() {
  clearAllQueries();
}

async function createCard(item) {
  let title = null;
  let type = null;
  let source = null;

  if(item['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'][0].id.includes('openstreetmap')) {
    title = item['https://w3id.org/openstreetmap/terms#name'][0].value;
    type = getOSMLabel(item);
    source = 'osm';
  } else if(item['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'][0].id.includes('geonames')) {
    title = item['http://www.geonames.org/ontology#name'][0].value;
    type = getGeonamesLabel(item['http://www.geonames.org/ontology#featureCode'][0].id);
    source = 'geonames';
  }

  addSideBarItem(title, type, source, item);
}

function getOSMLabel(entity) {
  const base = 'https://w3id.org/openstreetmap/terms#'
  if(entity[`${base}class`]) {
    return `Class (${entity[`${base}class`][0].id.split('#')[1]})`;
  }
  if(entity[`${base}boundary`]) {
    return `Boundary (${entity[`${base}boundary`][0].id.split('#')[1]})`;
  }
  if(entity[`${base}place`]) {
    return `Place (${entity[`${base}place`][0].id.split('#')[1]})`;
  }
  if(entity[`${base}highway`]) {
    return `Highway (${entity[`${base}highway`][0].id.split('#')[1]})`;
  }
  if(entity[`${base}waterway`]) {
    return `Waterway (${entity[`${base}waterway`][0].id.split('#')[1]})`;
  }
  if(entity[`${base}multiple`]) {
    return `Multiple (${entity[`${base}multiple`][0].id.split('#')[1]})`;
  }
  if(entity[`${base}natural`]) {
    return `Natural (${entity[`${base}natural`][0].id.split('#')[1]})`;
  }
  if(entity[`${base}landuse`]) {
    return `Land use (${entity[`${base}landuse`][0].id.split('#')[1]})`;
  }
}

function getGeonamesLabel(featureCode) {
  for (q of quadStore.getQuads(featureCode, 'http://www.w3.org/2004/02/skos/core#prefLabel')) {
    if (q.object.language === 'en') {
      return q.object.value;
    }
  }
}

async function addSideBarItem(title, type, source, item) {
  let id = item["id"];
  if (currentDisplayedItems.length >= 25) {
    // Only accept exact matches if we have more than 25 elements
    if (normalize(title) !== normalize(item.query)) {
      return;
    }
  }
  if (currentDisplayedItems.indexOf(id) !== -1) { return }

  currentDisplayedItems.push(id)

  let sidebarContainer = document.getElementById("autocomplete-items")
  let sidebarItem = document.createElement("div");
  let sidebarItemTitle = document.createElement("h5");
  sidebarItem.className = "sidebarItem";
  sidebarItemTitle.className = "sidebarItemTitle";
  sidebarItemTitle.innerHTML = title;
  sidebarItem.appendChild(sidebarItemTitle);

  const lat = item['http://www.w3.org/2003/01/geo/wgs84_pos#lat'][0].value;
  const lon = item['http://www.w3.org/2003/01/geo/wgs84_pos#long'][0].value;

  let sidebarItemP = document.createElement("p");
  sidebarItemP.className = "sidebarItemP";
  sidebarItemP.innerHTML = `${type} - ${item['http://www.opengis.net/ont/geosparql#asWKT'][0].value}`;
  sidebarItem.appendChild(sidebarItemP);

  let sourceImage = document.createElement("img");
  sourceImage.className = `${source}SidebarSource`;
  sourceImage.src = `img/${source}_logo.png`;
  sidebarItem.appendChild(sourceImage);

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
      <strong>Id:</strong> <a href="${id}" target="_blank">${id}</a><br/>
      <strong>Name: </strong><span>${title}</span><br/>
      <strong>Type: </strong><span>${type}</span><br/>
      <strong>Latitude: </strong><span>${lat}</span><br/>
      <strong>Longitude: </strong><span>${lon}</span>

    `);

    new mapboxgl.Marker()
      .setLngLat([lon, lat])
      .setPopup(popup)
      .addTo(map);

    const wkt = item['http://www.opengis.net/ont/geosparql#asWKT'][0].value;

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

  // Insert exact matches at the beginning 
  if (sidebarContainer.childNodes.length > 0) {
    if (normalize(title) === normalize(item.query)) {
      sidebarContainer.insertBefore(sidebarItem, sidebarContainer.childNodes[0]);
      if (sidebarContainer.childNodes.length > 25) {
        sidebarContainer.lastElementChild.remove();
      }
    } else {
      sidebarContainer.appendChild(sidebarItem);
    }
  } else {
    sidebarContainer.appendChild(sidebarItem);
  }
}

function clearSideBarItems() {
  currentDisplayedItems = []
  let sidebarContainer = document.getElementById("autocomplete-items")
  sidebarContainer.innerHTML = ""
  sidebarcount = 0;
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

function clearAllQueries() {
  clearSideBarItems()
}

function interruptAllQueries() {
  acClient.interrupt()
}


function getIdOrValue(object) {
  if (Array.isArray(object) && object.length === 1) { return getIdOrValue(object[0]) }
  if (object["value"] !== null && object["value"] !== undefined) {
    return object["value"]
  }
  if (object["id"] !== null && object["id"] !== undefined) {
    return object["id"]
  }
  if (object["@id"] !== null && object["@id"] !== undefined) {
    return object["@id"]
  }
  return null
}

function parseData(data) {
  let idmap = new Map()
  let typeMap = new Map();
  let shaclpath = propertyPath
  let searchValue = sv;
  let quads = data.quads

  for (let quad of quads) {
    let subject = quad.subject.value, predicate = quad.predicate.value, object = quad.object.value
    idmap.has(subject) ? idmap.get(subject)[predicate] = object : idmap.set(subject, { "id": subject, [predicate]: object })
    switch (predicate) {
      case "http://www.w3.org/1999/02/22-rdf-syntax-ns#type":
        typeMap.has(object) ? typeMap.get(object).push(subject) : typeMap.set(object, [subject])
        break;
    }
  }

  let dataEntities = []
  for (let entityId of typeMap.get('http://www.geonames.org/ontology#Feature')) {
    let entity = idmap.get(entityId)
    // Test current entities
    let currentState = entity;
    for (let predicate of shaclpath) {
      currentState = currentState && currentState[predicate] ? currentState[predicate] : null
    }
    if (treeBrowser.Normalizer.normalize(currentState).startsWith(treeBrowser.Normalizer.normalize(searchValue))) {
      dataEntities.push({ entity: entity, query: searchValue })
    }
  }
  return dataEntities
}
