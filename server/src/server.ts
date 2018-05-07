/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
"use strict";

import {
  createConnection,
  TextDocuments,
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  Proposed
} from "vscode-languageserver";
const fs = require("fs");

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
//Grabs each text document currently open in VSCode
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
  let capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we will fall back using global settings
  hasWorkspaceFolderCapability =
    (capabilities as Proposed.WorkspaceFoldersClientCapabilities).workspace &&
    !!(capabilities as Proposed.WorkspaceFoldersClientCapabilities).workspace
      .workspaceFolders;
  hasConfigurationCapability =
    (capabilities as Proposed.ConfigurationClientCapabilities).workspace &&
    !!(capabilities as Proposed.ConfigurationClientCapabilities).workspace
      .configuration;

  return {
    capabilities: {
      textDocumentSync: documents.syncKind
    }
  };
});

connection.onInitialized(() => {
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log("Workspace folder change event received");
    });
  }
});

// The example settings
interface ReactEdSettings {
  maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ReactEdSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ReactEdSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ReactEdSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = <ReactEdSettings>(change.settings.lspMultiRootSample ||
      defaultSettings);
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ReactEdSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({ scopeUri: resource });
    documentSettings.set(resource, result);
  }
  return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
  documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  // Trying to dynamically make props obj
  //traces path of props from state through children
  function traceProp(comp: string, prop: string, obj: any): boolean {
    let props = obj[comp].props;

    let parent = obj[comp].parent;
    if (props[prop] && props[prop].includes("state")) {
      return true;
    } else {
      if (parent && props[prop]) {
        let newProp = props[prop].substr(6, props[prop].length - 6);
        return traceProp(parent, newProp, obj);
      } else {
        return false;
      }
    }
  }
  //returns props passed from state to component
  function recurseItUp(comp: string, obj: any): any {
    let propArr = [];

    let props = obj[comp].props;

    let parent = obj[comp].parent;

    for (let key in props) {
      if (props[key].includes("state")) {
        propArr.push(key);
      } else {
        if (parent) {
          let prop = props[key].substr(6, props[key].length - 6);
          let push = traceProp(parent, prop, obj);
          if (push) {
            propArr.push(key);
          }
        }
      }
    }
    return propArr;
	}
	
	//parses through component tree file to create component/props obj & component array
  let content = fs.readFileSync(
    __dirname + "/../../server/src/componentTree.json"
  );
  let tree = JSON.parse(content.toString());
  let componentArray = Object.keys(tree);

  // In this simple example we get the settings for every validate run.
  let settings = await getDocumentSettings(textDocument.uri);
  // The validator creates diagnostics for all uppercase words length 2 and more
  let text = textDocument.getText();
  let ImPattern = /class.[A-Z].*|const.[A-Z].*|let.[A-Z].*/g;
  let n: RegExpExecArray;
  let o: RegExpExecArray;

  let problems = 0;
  let diagnostics: Diagnostic[] = [];
	//iterates through text documents open in VSCode looking for instances of regex matches; assigns as problem to underline and show props
  while (
    (n = ImPattern.exec(text)) &&
    problems < settings.maxNumberOfProblems
  ) {
    let ImPatternCheck = /[A-Z][A-Za-z]*/;
    if (ImPatternCheck.exec(n[0])) {
      o = ImPatternCheck.exec(n[0]);
      let propsObj;
			// TODO look up component array using keys 
      for (let i = 0; i < componentArray.length; i++) {
        if (o[0] === componentArray[i]) {
          propsObj = recurseItUp(o[0], tree);
        }
      }
			problems++;
			//generate diagnostic object with prop information/relationships
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: textDocument.positionAt(n.index),
          end: textDocument.positionAt(n.index + n[0].length)
				},
				//TODO create wording when prop is not passed correctly/completely
        message: `Props: ${JSON.stringify(propsObj)}`,
        source: "ReactEd"
      });
    }
  }

  // Send the computed diagnostics to VSCode.
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
