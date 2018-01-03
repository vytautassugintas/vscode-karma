'use strict';
import {window, commands, workspace, Range, OverviewRulerLane, DecorationRangeBehavior, DecorationOptions, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, Position, TextLine} from 'vscode';
import * as cp from 'child_process';

export function activate(context: ExtensionContext) {
	console.log(workspace.workspaceFolders[0].uri.path);
	let failedLines = [];

	const cwd = workspace.workspaceFolders[0].uri.path;
    const p = cp.exec("karma start --single-run", {cwd: cwd});
		p.stderr.on('data', (chunk: string) => {
            console.log("----got some data stderr");
            console.log(chunk);
        });

		p.stdout.on('data', (chunk: string) => {
			if(chunk.includes("FAILED")){
				const whereItFailedLineRegEx = /at.*/g
				const lineNumberRegEx = /\d+\:+\d+/g;
				const testFileName = /\w+\.+\w+\.+\w+/g;

				const lineText = whereItFailedLineRegEx.exec(chunk)[0];
				const lineNumber = lineNumberRegEx.exec(lineText)[0];
				
				failedLines.push(lineNumber);

				triggerUpdateDecorations();
			}
            console.log(chunk);   
        });

		p.on('close', (_code: number, _signal: string) => {
			try {
                console.log("Closed");
				console.log(_code);   
			} catch (e) {
				console.log(e);
			}
		});

	const passedTestDecoration = window.createTextEditorDecorationType({
		overviewRulerColor: 'green',
		overviewRulerLane: OverviewRulerLane.Left,
		light: {
		before: {
			color: '#3BB26B',
			contentText: '●',
		},
		},
		dark: {
		before: {
			color: '#2F8F51',
			contentText: '●',
		},
		},
		rangeBehavior: DecorationRangeBehavior.ClosedClosed,
	});

	const failedExpectDecorations = window.createTextEditorDecorationType({
		overviewRulerColor: 'red',
		overviewRulerLane: OverviewRulerLane.Left,
		light: {
		before: {
			color: 'red',
			contentText: '●',
		},
		},
		dark: {
		before: {
			color: 'red',
			contentText: '●',
		},
		},
		rangeBehavior: DecorationRangeBehavior.ClosedClosed,
	});

	let activeEditor = window.activeTextEditor;

	if (activeEditor) {
		triggerUpdateDecorations();
	}

	window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	var timeout = null;
	function triggerUpdateDecorations() {
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(updateDecorations, 500);
	}

	function updateDecorations() {
		if (!activeEditor) {
			return;
		}
		const regEx = /\sit\(/g;
		const text = activeEditor.document.getText();

		const passedTests: DecorationOptions[] = [];
		const failedExpects: DecorationOptions[] = [];

		let match;

		while (match = regEx.exec(text)) {
			const startPos = activeEditor.document.positionAt(match.index);
			const endPos = activeEditor.document.positionAt(match.index + match[0].length);
			const decoration = { range: new Range(startPos, endPos), hoverMessage: 'Passed' };
			passedTests.push(decoration);
		}

		failedLines.forEach(line => {
			const splittedLine = line.split(":");
			const startPos = new Position(parseInt(splittedLine[0]) - 1, parseInt(splittedLine[1]));
			const textLine: TextLine = activeEditor.document.lineAt(startPos);

			const decoration = { 
				range: textLine.range
			};
			failedExpects.push(decoration);
		})

		activeEditor.setDecorations(failedExpectDecorations, failedExpects);
		activeEditor.setDecorations(passedTestDecoration, passedTests);
	}
}

// this method is called when your extension is deactivated
export function deactivate() {
}