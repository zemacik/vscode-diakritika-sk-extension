'use strict';
import * as vscode from 'vscode';
import fs = require('fs');
import DiacriticsAdder from './diacriticsAdder';
var DiacriticsRemover = require('diacritics');

interface IDiacriticsSettings {
    dictionary: string;
    ignoreWordsList: string[];
}

// GLOBALS
let dictionary: Object = null;
let settings: IDiacriticsSettings;
let CONFIGFILE = vscode.workspace.rootPath + "/.vscode/diakritika_sk.json";
let diacriticsAdder: DiacriticsAdder;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('Activating extension - "vscode-diakritika-sk-extension"');

    settings = readSettings();
    diacriticsAdder = new DiacriticsAdder(settings.dictionary, settings.ignoreWordsList);

    let addDiacriticsDisposable = vscode.commands.registerCommand('extension.addDiacritics', addDiacritics);
    context.subscriptions.push(addDiacriticsDisposable);

    let removeDiacriticsDisposable = vscode.commands.registerCommand('extension.removeDiacritics', removeDiacritics);
    context.subscriptions.push(removeDiacriticsDisposable);

    let changeDictionaryDisposable = vscode.commands.registerCommand('extension.changeDictionary', changeDictionary);
    context.subscriptions.push(changeDictionaryDisposable);

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
            cfg = JSON.parse('{"version": "0.0.1", "dictionary": "SK", "ignoreWordsList": [] }');
        }

        return cfg;
    }

    return {
        dictionary: cfg.dictionary,
        ignoreWordsList: cfg.ignoreWordsList
    }
}

function updateSettings(): void {
    if (!vscode.workspace.rootPath)
        return;
        
    fs.writeFileSync(CONFIGFILE, JSON.stringify(settings));
}

function changeDictionary() {
    let items: vscode.QuickPickItem[] = [];

    items.push({ label: "Short dictionary (50 000 words, faster to initialize)", description: "SK" });
    items.push({ label: "Long dictionary (1 800 000 words, slower to initialize)", description: "SK_long" });
    // let index: number;
    // for (let i = 0; i < items.length; i++) {
    //     let element = items[i];
    //     if (element.description == settings.dictionary) {
    //         index = i;
    //         break;
    //     }
    // }
    //items.splice(index, 1);
    
    // replace the text with the selection
    vscode.window.showQuickPick(items).then((selection) => {
        if (!selection)
            return;

        settings.dictionary = selection.description;
        diacriticsAdder.dictionaryChanged(settings.dictionary);
        updateSettings();
    });
}

