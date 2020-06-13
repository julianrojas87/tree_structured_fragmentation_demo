import { FuzzyAutocompleteClient, SubstringQuery } from "rdf_tree_browser";


self.addEventListener('message', e => {
    const acClient = new FuzzyAutocompleteClient(25);

    acClient.on("topn", data => {
        self.postMessage(data);
    });

    acClient.query(e.data.query.trim(), SubstringQuery, [e.data.treePath], e.data.collection, 25);
});