import { FuzzyAutocompleteClient, SubstringQuery } from "rdf_tree_browser";


self.addEventListener('message', e => {
    const acClient = new FuzzyAutocompleteClient(25);

    acClient.on("topn", data => {
        self.postMessage(data);
    });

    for (let i = 0; i < e.data.collections.length; i++) {
        acClient.query(e.data.query.trim(), SubstringQuery, [e.data.treePaths[i]], e.data.collections[i], 25);
    }
});