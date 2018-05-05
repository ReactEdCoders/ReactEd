'use strict';

import * as path from 'path';
import * as fs from 'fs';
import traverseWebpack from './traverseWebpack';
import { window, workspace, ExtensionContext, WorkspaceConfiguration, Disposable } from 'vscode';
import { 
	LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, CancellationToken, Middleware, 
	DidChangeConfigurationNotification, Proposed, ProposedFeatures
} from 'vscode-languageclient';
interface MultiRootExampleSettings {
	maxNumberOfProblems: number;
}

let client: LanguageClient;

namespace Configuration {

	let configurationListener: Disposable;

	// Convert VS Code specific settings to a format acceptable by the server. Since
	// both client and server do use JSON the conversion is trivial. 
	export function computeConfiguration(params: Proposed.ConfigurationParams, _token: CancellationToken, _next: Function): any[] {
		if (!params.items) {
			return null;
		}
		let result: (MultiRootExampleSettings | null)[] = [];
		for (let item of params.items) {
			// The server asks the client for configuration settings without a section
			// If a section is present we return null to indicate that the configuration
			// is not supported.
			if (item.section) {
				result.push(null);
				continue;
			}
			let config: WorkspaceConfiguration;
			if (item.scopeUri) {
				config = workspace.getConfiguration('ReactEd', client.protocol2CodeConverter.asUri(item.scopeUri));
			} else {
				config = workspace.getConfiguration('ReactEd');
			}
			result.push({
				maxNumberOfProblems: config.get('maxNumberOfProblems')
			});
		}
		return result;
	}
	
	export function initialize() {
		// VS Code currently doesn't sent fine grained configuration changes. So we 
		// listen to any change. However this will change in the near future.
		configurationListener = workspace.onDidChangeConfiguration(() => {
			client.sendNotification(DidChangeConfigurationNotification.type, { settings: null });
		});
		
		
	}

	export function dispose() {
		if (configurationListener) {
			configurationListener.dispose();
		}
	}
}



export function activate(context: ExtensionContext) {
	function pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}
		return true;
	}

	const WebpackPath = path.join(workspace.rootPath, 'webpack.config.js');
	window.showInformationMessage(WebpackPath);
  	if (pathExists(WebpackPath)) {
	let content = fs.readFileSync(WebpackPath, 'utf-8');
	const filepathReg = /.*path:.*'|.*path:.*"/g;
	const filenameReg = /.*filename:.*'|.*filename:.*"/g;

	let filepathLine = content.match(filepathReg);
	let filenameLine = content.match(filenameReg);

	let filesReg = /'.*'|".*"/g;

	let filepath = filepathLine[0].match(filesReg);
	let filename = filenameLine[0].match(filesReg);

	let bundle = path.join(workspace.rootPath, filepath[0].slice(1, filepath[0].length-1), filename[0].slice(1, filename[0].length-1));

	if (pathExists(bundle)) {
		window.showInformationMessage(bundle);
		let classReg = /_createClass\([A-Z][A-Za-z]*/;
		let propsReg = /var.[A-Z][A-Za-z]*.=.function.[A-Z][A-Za-z]*\(props\).{/;
		let compReg = /_react2.default.createElement\(_[A-Z][A-Za-z]*/;
		let traverse = new traverseWebpack();
		traverse.grepWithFs(bundle, '_reactDom.render', classReg, propsReg, compReg);
		let debounce = false;
			fs.watch(bundle, { encoding: 'buffer' }, (event, filename) => {
				if(event === 'change' && !debounce && filename) {
					console.log('I ran');
					debounce = true;
					setTimeout(() => {
						debounce = false;
					}, 5000)
					traverse.grepWithFs(bundle, '_reactDom.render', classReg, propsReg, compReg);
				}
			});
		
		
	} else {
		window.showInformationMessage('Workspace has no Webpack');
	  }
	
	}
	// The server is implemented in node
	let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
	// The debug options for the server
	let debugOptions = { execArgv: ["--debug=5859"] };
	
	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run : { module: serverModule, transport: TransportKind.ipc },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
	}

	let middleware: ProposedFeatures.ConfigurationMiddleware | Middleware = {
		workspace: {
			configuration: Configuration.computeConfiguration
		}
	};

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{scheme: 'file', language: 'javascript'},{scheme: 'file', language: 'javascriptreact'}],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contain in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc'),
			// In the past this told the client to actively synchronize settings. Since the
			// client now supports 'getConfiguration' requests this active synchronization is not
			// necessary anymore. 
			// configurationSection: [ 'lspMultiRootSample' ]
		},
		middleware: middleware as Middleware
	}
	
	// Create the language client and start the client.
	client = new LanguageClient('languageServerExample', 'Language Server Example', serverOptions, clientOptions);
	// Register new proposed protocol if available.
	client.registerProposedFeatures();
	client.onReady().then(() => {
		Configuration.initialize();
	});
	
	// Start the client. This will also launch the server
	client.start();
}

export function deactivate(): Thenable<void> {
	if (!client) {
		return undefined;
	}
	Configuration.dispose();
	return client.stop();
}