'use strict';

import DiacriticsRemover = require('diacritics');
import csv = require("fast-csv");
import fs = require("fs");
import path = require("path");
import { Stream } from "stream";
import ArrayStream = require('arraystream');

export default class DiacriticsAdder {
    private _ignoredWordList: string[];
    private _dictionaryPath: string;
    private _dictionary: Object = {};
    private _activeDictionary: string;

    public isInitialized: boolean = false;

    constructor(dictionary: string, ignoredWordList?: string[], dictionaryPath?: string) {
        this._ignoredWordList = ignoredWordList || [];
        this._dictionaryPath = dictionaryPath || './resources';
        this._activeDictionary = dictionary || 'SK';
    }

    public initialize(): Stream {
        if (!this.isInitialized) {

            var dictionaryPath = this._dictionaryPath + "/dict_" + this._activeDictionary + ".txt";

            let rstream = fs.createReadStream(dictionaryPath)
                .pipe(csv.parse({ headers: true, delimiter: '\t' }))
                .transform(row => {
                    return {
                        w_n: DiacriticsRemover.remove(row.word),
                        w: row["word"],
                        n: parseInt(row.n)
                    };
                })
                .on("readable", () => {
                    var row;
                    while (null !== (row = rstream.read())) {
                        var rv = this._dictionary[row.w_n];
                        if (!rv)
                            this._dictionary[row.w_n] = [{ w: row.w, n: row.n }];
                        else {
                            var newObj = { w: row.w, n: row.n };
                            if (rv[0].n < row.n)
                                rv.unshift(newObj);
                            else
                                rv.push(newObj);
                        }
                    }
                })
                .on("end", () => {
                    console.log('Dictionary initialized');
                    this.isInitialized = true;
                });

            return rstream;
        }
        else {
            return new ArrayStream(this._dictionary);
        }
    }

    public add(text: string): string {
        if (!this.isInitialized)
            throw "Dictionary not initialized";

        return this.transform(text);
    }

    public dictionaryChanged(dictionary: string) {
        this._dictionary = {};
        this.isInitialized = false;
        this._activeDictionary = dictionary || 'SK';
    }

    private transform(text: string): string {
        if (!text)
            return null;

        var matches = text.match(/(\b[^\s]+\b)/g);

        for (var i = 0; i < matches.length; i++) {
            var match = matches[i];

            if (!!this._ignoredWordList[match]) {
                console.log("Ignoring word:", match);
                continue;
            }

            var bounded = new RegExp('\\b' + match + '\\b');
            var formatterResult = this.locateWordInDictinary(match);

            if (formatterResult != null) {
                var persistedCaseResult = this.persistCase(match, formatterResult);
                text = text.replace(bounded, persistedCaseResult);
            }
        }

        return text;
    }

    private locateWordInDictinary(word: string) {
        if (!word)
            return;

        var word_n = DiacriticsRemover.remove(word).toLowerCase();
        var dictValue = this._dictionary[word_n];

        if (dictValue == null)
            return null;

        return dictValue[0].w; // we return first word (with biggest score)
    }

    private persistCase(oldWord: string, newWord: string) {
        for (var i = 0; i < oldWord.length; i++) {
            var oldChar = oldWord[i];
            var oldCharIsUpperCase = oldChar == oldChar.toUpperCase();

            if (oldCharIsUpperCase)
                newWord = this.setCharAt(newWord, i, newWord[i].toUpperCase());
        }

        return newWord;
    };

    private setCharAt(str: string, index: number, chr: string): string {
        if (index > str.length - 1)
            return str;
        return str.substr(0, index) + chr + str.substr(index + 1);
    };
}