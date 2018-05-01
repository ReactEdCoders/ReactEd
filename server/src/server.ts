/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	createConnection, TextDocuments, TextDocument, Diagnostic, DiagnosticSeverity,
	ProposedFeatures, InitializeParams, Proposed
} from 'vscode-languageserver';
// import { Client } from '_debugger';
const fs = require('fs');
const qfgets = require('qfgets');


// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we will fall back using global settings
	hasWorkspaceFolderCapability = (capabilities as Proposed.WorkspaceFoldersClientCapabilities).workspace && !!(capabilities as Proposed.WorkspaceFoldersClientCapabilities).workspace.workspaceFolders;
	hasConfigurationCapability = (capabilities as Proposed.ConfigurationClientCapabilities).workspace && !!(capabilities as Proposed.ConfigurationClientCapabilities).workspace.configuration;

	return {
		capabilities: {
			textDocumentSync: documents.syncKind
		}
	}
});

connection.onInitialized(() => {
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders((_event) => {
			connection.console.log('Workspace folder change event received');
		});
	}
});

// The example settings
interface MultiRootExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: MultiRootExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: MultiRootExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<MultiRootExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <MultiRootExampleSettings>(change.settings.lspMultiRootSample || defaultSettings);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<MultiRootExampleSettings> {
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
documents.onDidChangeContent((change) => {
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// Trying to dynamically make props obj
	function grepWithFs( filename: string, regexp1: string, regexp2: RegExp, regexp3: RegExp, regexp4: RegExp ) {
		fs.writeFileSync(__dirname + '/../../server/src/testTwo.txt', __dirname)
		let fp = new qfgets(filename);
		let cont = '';
		function loop() {
			for (let i=0; i<40; i++) {

				let line = fp.fgets();
				if (line) {
				if (line.match(regexp1)) {
					cont += line + '\n';
				} else if (line.match(regexp2)) {
					cont += line + '\n';
				} else if (regexp3.exec(line)) {
					cont += line + '\n';
				} else if (regexp4.exec(line)) {
					cont += line + '\n';
				}
			}
		}
			if (!fp.feof()) setImmediate(loop);
			fs.writeFile(__dirname + '/../../server/src/comptest.txt', cont, (err: any) => {
				if (err) {
					console.log(err);
				} else {
					console.log(cont);
				}
			});
		}
		loop();
	}

	let classReg = /_createClass\([A-Z][A-Za-z]*/;
	let propsReg = /var.[A-Z][A-Za-z]*.=.function.[A-Z][A-Za-z]*\(props\).{/;
	let compReg = /_react2.default.createElement\(_[A-Z][A-Za-z]*/;
	let bundleFile = fs.readFileSync(__dirname + '/../../server/src/bundle.txt');

	grepWithFs(bundleFile.toString(), '_reactDom.render', classReg, propsReg, compReg);

	let components: any;
	components = {};
	let testExec: RegExpExecArray;

	let testCont = fs.readFileSync(__dirname + '/../../server/src/comptest.txt');
	let testReg = /_[A-Z][A-Za-z]*2\.default|[A-Z][A-Za-z]*\.default/;
		
	if (testExec = testReg.exec(testCont.toString())) {
		components[testExec[0]] = true;
		fs.writeFileSync(__dirname + '/../../server/src/test.json', components);
	}

	// fs.writeFileSync(__dirname + '/../../server/src/test.json', JSON.stringify(components));

	let content = fs.readFileSync(__dirname + '/../../server/src/components.json');
	let arr = JSON.parse(content.toString());

	// In this simple example we get the settings for every validate run.
	let settings = await getDocumentSettings(textDocument.uri);
	// The validator creates diagnostics for all uppercase words length 2 and more
	let text = textDocument.getText();
	let ImPattern = /class.[A-Z].*|const.[A-Z].*|let.[A-Z].*/g;
	let n: RegExpExecArray;
	let o: RegExpExecArray;

	let problems = 0;
	let diagnostics: Diagnostic[] = [];

	while ((n = ImPattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		let ImPatternCheck = /[A-Z][A-Za-z]*/;
		if (ImPatternCheck.exec(n[0])) {
		o = ImPatternCheck.exec(n[0]);
		let propsArr;
		let mapped;
		// let propsArrStr;

		for (let jind = 0; jind < arr.length; jind++) {
			let currCompArr = Object.keys(arr[jind]);
			let currComp = currCompArr[0];
			if (o[0] === currComp) {
				propsArr = arr[jind][currComp];
				mapped = propsArr.map((prop: string) => {
					return `props.${prop}`;
				}).join(', ')
				// propsArrStr = JSON.stringify(mapped);

			}
		}
		// console.log(propsArr);
		problems++;
		diagnostics.push({
			severity: DiagnosticSeverity.Warning,
			range: {
				start: textDocument.positionAt(n.index),
				end: textDocument.positionAt(n.index + n[0].length)
			},
			message: `Props: ${mapped}`,
			source: 'ReactEd'
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