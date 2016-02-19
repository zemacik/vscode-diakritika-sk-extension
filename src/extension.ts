'use strict';
import * as vscode from 'vscode';
import fs = require('fs');
import DiacriticsRemover = require('diacritics');
import DiacriticsAdder from './diacriticsAdder';

interface IDiacriticsSettings {
    ignoreWordsList: string[];
}

// GLOBALS ///////////////////
let dictionary: Object = null;
let settings: IDiacriticsSettings;
let CONFIGFILE = vscode.workspace.rootPath + "/.vscode/diakritika_sk.json";
let diacriticsAdder: DiacriticsAdder;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('Activating extension - "vscode-diakritika-sk-extension"');

    settings = readSettings();
    diacriticsAdder = new DiacriticsAdder(settings.ignoreWordsList);

    let addDiacriticsDisposable = vscode.commands.registerCommand('extension.addDiacritics', addDiacritics);
    context.subscriptions.push(addDiacriticsDisposable);

    let removeDiacriticsDisposable = vscode.commands.registerCommand('extension.removeDiacritics', removeDiacritics);
    context.subscriptions.push(removeDiacriticsDisposable);

    console.log('Extension activated - "vscode-diakritika-sk-extension"');
}

// this method is called when your extension is deactivated
export function deactivate() {
    dictionary = null;
}


function addDiacritics(): void {

    if (diacriticsAdder.isInitialized) {
        addDiacriticsToSelections();
        return;
    }

    var loadingMessage = vscode.window.setStatusBarMessage('Loading  dictionary...', 60000);

    diacriticsAdder.initialize()
        .on('end', () => {
            loadingMessage.dispose();
            addDiacriticsToSelections();
        });
}

function removeDiacritics(): void {
    let e = vscode.window.activeTextEditor;
    let d = e.document;
    let sels = e.selections;

    sels.forEach(selection => {
        let text = d.getText(new vscode.Range(selection.start, selection.end));
        let newText = DiacriticsRemover.remove(text);
        e.edit(edit => {
            edit.replace(selection, newText);
        });
    });
}

function addDiacriticsToSelections(): void {
    let e = vscode.window.activeTextEditor;
    let d = e.document;
    let sels = e.selections;

    sels.forEach(selection => {
        let text = d.getText(new vscode.Range(selection.start, selection.end));
        let newText = diacriticsAdder.add(text);
        e.edit(edit => {
            edit.replace(selection, newText);
        });
    });
}

function readSettings(): IDiacriticsSettings {
    let cfg: any = readJsonFile(CONFIGFILE);

    function readJsonFile(file): any {
        try {
            cfg = JSON.parse(fs.readFileSync(file).toString());
        }
        catch (err) {
            cfg = JSON.parse('{"version": "0.0.1", "ignoreWordsList": [] }');
        }

        return cfg;
    }

    return {
        ignoreWordsList: cfg.ignoreWordsList
    }
}

function updateSettings(): void {
    fs.writeFileSync(CONFIGFILE, JSON.stringify(settings));
}

