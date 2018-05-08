'use strict';
import * as path from 'path';
import * as fs from 'fs';
import traverseWebpack from './traverseWebpack';
import { window, workspace, ExtensionContext, WorkspaceConfiguration, Disposable } from 'vscode';
import { 
	LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, CancellationToken, Middleware,
	DidChangeConfigurationNotification, ConfigurationParams
} from 'vscode-languageclient';
interface ReactEdSettings {
	maxNumberOfProblems: number; 
}

let client: LanguageClient;

namespace Configuration {

	let configurationListener: Disposable;
	// Convert VS Code specific settings to a format acceptable by the server. Since
	// both client and server do use JSON the conversion is trivial. 
	export function computeConfiguration(params: ConfigurationParams, _token: CancellationToken, _next: Function): any[] {
		if (!params.items) {
			return null;
		}
		let result: (ReactEdSettings | null)[] = [];
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
				config = workspace.getConfiguration('reacted', client.protocol2CodeConverter.asUri(item.scopeUri));
			} else {
				config = workspace.getConfiguration('reacted');
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
	window.showInformationMessage('Started ReactEd');
	function pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}
		return true;
	}
	/**** Parsing through the webpack config file for bundle location ****/  
	const WebpackPath = path.join(workspace.rootPath, 'webpack.config.js'); // Accessing the webpack file
  	if (pathExists(WebpackPath)) {
	let content = fs.readFileSync(WebpackPath, 'utf-8');
	const filepathReg = /.*path:.*'|.*path:.*"/g; //Regex for the file path
	const filenameReg = /.*filename:.*'|.*filename:.*"/g; // Regex for the file name
	let filepathLine = content.match(filepathReg); // looking for the file path
	let filenameLine = content.match(filenameReg); //looking for the file name
	let filesReg = /'.*'|".*"/g;
	let filepath = filepathLine[0].match(filesReg);
	let filename = filenameLine[0].match(filesReg);
	let bundle = path.join(workspace.rootPath, filepath[0].slice(1, filepath[0].length-1), filename[0].slice(1, filename[0].length-1));
	/****if found bundle then traversing the bundle file ****/
	if (pathExists(bundle)) {
		window.showInformationMessage('Bundle Found..Starting Parse');
		let traverse = new traverseWebpack(); //Bringing in functionality for parsing the bundle file 
		traverse.grepWithFs(bundle);
		let debounce = false; 
			fs.watch(bundle, { encoding: 'buffer' }, (event, filename) => {
				if(event === 'change' && !debounce && filename) {
					debounce = true;
					setTimeout(() => {
						debounce = false;
					}, 5000)
					traverse.grepWithFs(bundle);
				}
			});	
	} else {
		window.showInformationMessage('Unable to find webpack bundle');
	  }
	}
	// The server is implemented in node
	let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
	// The debug options for the server
	let debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };
	
	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run : { module: serverModule, transport: TransportKind.ipc },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
	}
	let middleware: Middleware = {
		workspace: {
			configuration: Configuration.computeConfiguration
		}
	};
	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for javascript and JSX files
		documentSelector: [{scheme: 'file', language: 'javascript'},{scheme: 'file', language: 'javascriptreact'}],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contain in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		},
		middleware: middleware
	}
	// Create the language client and start the client.
	client = new LanguageClient('languageServerExample', 'Language Server Example', serverOptions, clientOptions);
	
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