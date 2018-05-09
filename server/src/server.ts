/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
"use strict";

import {
  createConnection, TextDocuments, TextDocument, Diagnostic, DiagnosticSeverity,
  ProposedFeatures, InitializeParams, DidChangeConfigurationNotification
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
  hasConfigurationCapability = capabilities.workspace && !!capabilities.workspace.configuration;
  hasWorkspaceFolderCapability = capabilities.workspace && !!capabilities.workspace.workspaceFolders;

  return {
    capabilities: {
      textDocumentSync: documents.syncKind
    }
  };
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.');
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
    globalSettings = <ReactEdSettings>(change.settings.reacted ||
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
    let propObj: any = {};
    propObj.state = [];
    propObj.parent = [];

    let props = obj[comp].props;

    let parent = obj[comp].parent;

    for (let key in props) {
      if (props[key].includes("state")) {
        propObj.state.push(key);
      } else {
        if (parent) {
          let prop = props[key].substr(6, props[key].length - 6);
          let push = traceProp(parent, prop, obj);
          if (push) {
            propObj.state.push(key);
          } else {
            propObj.parent.push(key);
          }
        }
      }
    }
    return propObj;
  }

  //parses through component tree file to create component/props obj & component array

  let content = fs.readFileSync(
    __dirname + "/../out/src/componentTree.json"
  );
  let tree = JSON.parse(content.toString());

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

      propsObj = recurseItUp(o[0], tree);
      let messageStr: string = '';
      if (propsObj.state.length > 0) messageStr += `Passed from state: ${JSON.stringify(propsObj.state)}`;
      if (messageStr != '') messageStr += '\n';
      if (propsObj.parent.length > 0) messageStr += `Passed from parent: ${JSON.stringify(propsObj.parent)}`;
      if (messageStr === '') messageStr += 'No Props passed';
      problems++;
      //generate diagnostic object with prop information/relationships
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: textDocument.positionAt(n.index + o.index),
          end: textDocument.positionAt(n.index + o[0].length + o.index)
        },
        message: messageStr,
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
