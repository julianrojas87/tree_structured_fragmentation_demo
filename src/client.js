const treeBrowser = require("rdf_tree_browser");
const normalize = treeBrowser.Normalizer.normalize;
const ldfetch = require('ldfetch');
const N3 = require('n3');
const Swal = require('sweetalert2');
const wktParser = require('wellknown');
const bbox = require('@turf/bbox').default;
var mapboxgl = require('mapbox-gl/dist/mapbox-gl.js');
mapboxgl.accessToken = 'pk.eyJ1IjoianVsaWFucm9qYXM4NyIsImEiOiJjazk2YTdmNDIwMHc2M2Vtamt1cHRwaDBrIn0.gSdLyC_7GdyVWle6QnAvbg';

var acClient = new treeBrowser.AutocompleteClient(false);
var quadStore = new N3.Store();
var propertyPath = "http://www.geonames.org/ontology#name";
var sv = null;


window.onload = function () {
  main();
}

async function main() {

  // Load GeoNames ontology
  const fetcher = new ldfetch();
  const quads = (await fetcher.get('http://n076-12.wall1.ilabt.iminds.be/geonames/ontology.rdf')).triples;
  quadStore.addQuads(quads);

  acClient.on("data", data => {
    let dataEntities = parseData(data);
    for (let entity of dataEntities) {
      createCard(entity)
    }
  });

  autocomplete(document.getElementById("bar"));
  document.getElementById("bar").addEventListener("input", async function (e) {
    sv = e.target.value;
    queryAutocompletion(e.target.value);
  });
}

var currentDisplayedItems = []

async function queryAutocompletion(searchValue) {
  if (searchValue === "") return;
  prepareForNewQuery(searchValue)
  let collection = 'http://n076-12.wall1.ilabt.iminds.be/geonames-tree/node0.jsonld#Collection'
  acClient.query(searchValue.trim(), treeBrowser.PrefixQuery, [propertyPath], collection, 25)
}

function prepareForNewQuery(searchValue) {
  clearAllQueries();
}

async function createCard(item) {
  const codeName = getLabel(item.entity);
  const geoName = item.entity[propertyPath];

  let tripleString = codeName;
  let cardTitle = geoName;

  addSideBarItem(cardTitle, tripleString, item, function (id) { window.open(id) })
}

function getLabel(entity) {
  for (q of quadStore.getQuads(entity['http://www.geonames.org/ontology#featureCode'], 'http://www.w3.org/2004/02/skos/core#prefLabel')) {
    if (q.object.language === 'en') {
      return q.object.value;
    }
  }
}

async function addSideBarItem(title, type, item, onclickfct = null, lat = null, long = null) {
  let id = item.entity["id"]
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

  let sidebarItemP = document.createElement("p");
  sidebarItemP.className = "sidebarItemP";
  sidebarItemP.innerHTML = type;
  sidebarItem.appendChild(sidebarItemP);

  sidebarItem.addEventListener('click', () => {

    Swal.fire({
      title: `<strong><a href="${id}" target="_blank">${title}</a></strong>`,
      html: `<div style="height: inherit" id="map_${id}"></div>`,
      showCloseButton: true,
      showConfirmButton: false
    });

    const lat = item.entity['http://www.w3.org/2003/01/geo/wgs84_pos#lat'];
    const lon = item.entity['http://www.w3.org/2003/01/geo/wgs84_pos#long'];

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

    const wkt = item.entity['http://www.opengis.net/ont/geosparql#asWKT'];

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
  interruptAllQueries()
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
  let shaclpath = [propertyPath]
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
