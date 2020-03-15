const treeBrowser = require("rdf_tree_browser")
let requiredResults = 10;
var currentautocompletiontype = "btree"
let cacheMisses = 0;
let totalRequests = 0;
let individualRequests = new Set();


let acClient = new treeBrowser.AutocompleteClient(false)

window.onload = function() {main()}

async function main() {
  let cacheCountDisplay = document.getElementById('cachemisses')
  let requestCounterDisplay = document.getElementById('requestcounter')
  let individualCounterDisplay = document.getElementById('individualrequestscounter')
  acClient.on('client-cache-miss', (e) => {cacheMisses += 1; cacheCountDisplay.innerHTML = cacheMisses})

  acClient.on("data", (data) => {
    let dataEntities = parseData(data)
    for (let entity of dataEntities){
      createCard(entity)
    }
  });

  autocomplete(document.getElementById("bar"));
  document.getElementById("bar").addEventListener("input", async function(e) {
    let searchValue = e.target.value
    if (searchValue === "") { clearAllQueries(); return; }
    totalRequests += 1;
    requestCounterDisplay.innerHTML = totalRequests
    individualRequests.add(searchValue)
    individualCounterDisplay.innerHTML = individualRequests.size
    queryAutocompletion(searchValue);
  });
}

var currentDisplayedItems = []

async function queryAutocompletion(searchValue){
  if (searchValue === "") { clearAllQueries(); return; }
  prepareForNewQuery(searchValue)
  let streetsURI = 'http://193.190.127.164/minidemostreetdata/25/node0.jsonld#Collection'
  let propertypath = ["http://www.w3.org/2000/01/rdf-schema#label"];
  acClient.query(searchValue.trim(), treeBrowser.BTreePrefixQuery, propertypath, streetsURI, requiredResults)
}

function prepareForNewQuery(searchValue){
  clearAllQueries()
}

async function createCard(item){
  let tripleString = "<a href=\""+item.streetName['id'] + "\" target=\"_blank\" title=\"" + item.streetName['http://www.w3.org/2000/01/rdf-schema#label'] + "\">streetname:" + item.streetName['id'].split('/').pop() + "</a> <abbr title=\"prov:wasAttributedTo\">in</abbr> <a href=\""+ item.municipalityName['id'] + "\" target=\"_blank\" title=\"" + item.municipalityName['http://www.w3.org/2000/01/rdf-schema#label'] + "\">municipality:" + item.municipalityName['id'].split('/').pop() + "</a>.";
  
  let cardTitle = item.streetName['http://www.w3.org/2000/01/rdf-schema#label'] + " <span class=\"municipality-name\">" + item.municipalityName['http://www.w3.org/2000/01/rdf-schema#label'] + "</span>"
  addSideBarItem(cardTitle, tripleString, item, function(id) { window.open(id) })
}

async function addSideBarItem(title, triple, item, onclickfct = null, lat = null, long = null) {
  let id = item.streetName["id"]
  if (currentDisplayedItems.length >= 25) {
    interruptAllQueries()
    return
  }
  if(currentDisplayedItems.indexOf(id) !== -1) { return }

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
  sidebarItemP.innerHTML = triple;
  sidebarItem.appendChild(sidebarItemP);
  

  sidebarContainer.appendChild(sidebarItem);

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
  inp.addEventListener("keydown", function(e) {
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
  document.addEventListener("click", function(e) {
      closeAllLists(e.target);
  });
}

function clearAllQueries(){
  interruptAllQueries()
  clearSideBarItems()
}

function interruptAllQueries(){
  acClient.interrupt()
}


function getIdOrValue(object){
  if (Array.isArray(object) && object.length === 1){ return getIdOrValue(object[0])}
  if (object["value"] !== null && object["value"]!== undefined){
    return object["value"]
  }
  if (object["id"] !== null && object["id"]!== undefined){
    return object["id"]
  }
  if (object["@id"] !== null && object["@id"]!== undefined){
    return object["@id"]
  }
  return null
}

function parseData(data){
  let idmap = new Map()
  let typeMap = new Map();
  let namePerMunicipality = new Map();
  let shaclpath = data.shaclpath
  let searchValue = data.searchValue
  let quads = data.data

  for(let quad of quads) {
    let subject = quad.subject.value, predicate = quad.predicate.value, object = quad.object.value
    idmap.has(subject) ? idmap.get(subject)[predicate] = object : idmap.set(subject, {"id": subject, [predicate]: object})
    switch (predicate) {
      case "https://data.vlaanderen.be/ns/adres#isAfgeleidVan":
        namePerMunicipality.set(object, subject)
        break;
      case "http://www.w3.org/1999/02/22-rdf-syntax-ns#type":
        typeMap.has(object) ? typeMap.get(object).push(subject) : typeMap.set(object, [subject])
        break;
    }
  }

  let dataEntities  = []
  for (let streetNameId of typeMap.get('https://data.vlaanderen.be/ns/adres#Straatnaam')){
    let streetName = idmap.get(streetNameId)
    let municipality = idmap.get(streetName['http://www.w3.org/ns/prov#wasAttributedTo'])
    let municipalityName = idmap.get(namePerMunicipality.get(municipality['id']))

    // Test street name prefix
    let currentState = streetName
    for (let predicate of shaclpath){
      currentState = currentState && currentState[predicate] ? currentState[predicate] : null
    }
    if(treeBrowser.Normalizer.normalize(currentState).startsWith(treeBrowser.Normalizer.normalize(searchValue))) {
      dataEntities.push({streetName: streetName, municipality: municipality, municipalityName: municipalityName})
    }
  }
  return dataEntities
}
