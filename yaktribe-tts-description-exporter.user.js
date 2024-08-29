// ==UserScript==
// @name         YakTribe TTS description exporter
// @namespace    lunarrequiem.net
// @version      0.1.1
// @description  Exports Necromunda Underhive data to a format that can be pasted into TTS model descriptions
// @author       Lunar Dawn
// @match        https://yaktribe.games/underhive/print/cards/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=yaktribe.games
// @grant        none
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// @require      https://raw.githubusercontent.com/Lunar-Dawn/Yaktribe-TTS-Export/main/jszip.min.js
// @require      https://raw.githubusercontent.com/Lunar-Dawn/Yaktribe-TTS-Export/main/FileSaver.min.js
// @updateURL    https://raw.githubusercontent.com/Lunar-Dawn/Yaktribe-TTS-Export/main/yaktribe-tts-description-exporter.user.js
// @downloadURL  https://raw.githubusercontent.com/Lunar-Dawn/Yaktribe-TTS-Export/main/yaktribe-tts-description-exporter.user.js
// ==/UserScript==

const styleTag = `
<style>
    .export-all-button {
        position: fixed;
        top: 0;
        right: 0;
        background: #06BE00;
        border: 0;
        padding: 15px;
        font-size: 1.4em;
        border-left: grey 1px solid;
        border-bottom: grey 1px solid;
        border-bottom-left-radius: 5px;
    }
    .export-all-button:hover {
        background: #07DC00;
    }

    .card-toolbar {
        display: flex;
        opacity: 0;

        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;

        border-top: 1px #636363 solid;

        transition: opacity 1s;
    }
    .gang-ganger-card:hover > .card-toolbar {
        opacity: 1;
        transition: opacity 0s;
    }

    .card-toolbar > button {
        padding: 10px 0;
        flex: 1;
        border: 0;
        background: #CCCCCC;

        transition: background 0.1s;
    }
    .card-toolbar > button:hover {
        background: #AAAAAA;

        transition: background 0s;
    }
    .card-toolbar > button.last-pressed-button {
        background: #07DC00;
        transition: background 0.1s;
    }
    .card-toolbar > button.last-pressed-button:hover {
        background: #07DC00;
    }
    .force-visible {
        opacity: 1;
    }
</style>`;

class Weapon {
    constructor(tableRow) {
        console.debug(tableRow)
        const stats = $(tableRow).find("td")
        this.Name = stats[0].innerText
        this.S = stats[1].innerText
        this.L = stats[2].innerText
        this.AcS = stats[3].innerText
        this.AcL = stats[4].innerText
        this.Str = stats[5].innerText
        this.D = stats[6].innerText
        this.Ap = stats[7].innerText
        this.Am = stats[8].innerText
        this.Traits = stats[9].innerText.split(",")
    }

    toText() {
        return `[c6c930]${this.Name}[-]\n` +
            `S:${this.S} L:${this.L} AcS:${this.AcS} AcL:${this.AcL} S:${this.Str} AP:${this.Ap} D:${this.D} ${this.Am === '-' ? '' : `Am:${this.Am} `}[8b8000]${this.Traits.join(', ')}[-]`
    }
}
class Ganger {
    constructor(card) {
        this.Name = $(card).find(".gang-ganger-name > h5")[0].childNodes[1].nodeValue.trim()
        this.Type = $(card).find(".gang-ganger-name > h5 > small").text().trim()
        console.debug(`${this.Type}: ${this.Name}`)

        const attributes = $(card).find(".gang-ganger-stats > tbody td")
        console.debug(attributes)
        this.M = attributes[0].innerText
        this.WS = attributes[1].innerText
        this.BS = attributes[2].innerText
        this.S = attributes[3].innerText
        this.T = attributes[4].innerText
        this.W = attributes[5].innerText
        this.I = attributes[6].innerText
        this.A = attributes[7].innerText
        this.Ld = attributes[8].innerText
        this.Cl = attributes[9].innerText
        this.Wil = attributes[10].innerText
        this.Int = attributes[11].innerText

        this.weapons = $(card).find(".gang-ganger-weapons > tbody > tr").toArray().map(e => new Weapon(e))

        const finalTable = $(card).find("table.mb-1 > tbody > tr")
        this.wargear = finalTable.has("td:contains('WARGEAR')")?.find("td")[1]?.innerText?.split(",").map(s => s.trim()).filter(Boolean) || ["-"]
        this.skills = finalTable.has("td:contains('SKILLS')")?.find("td")[1]?.innerText?.split(",").map(s => s.trim()).filter(Boolean) || ["-"]
        this.rules = finalTable.has("td:contains('RULES')")?.find("td")[1]?.innerText?.split(",").map(s => s.trim()).filter(Boolean) || ["-"]
    }

    get modelName() {
        return `[56f442]${this.W}/${this.W}[-] [f51105]${this.Name}[-] [edf505](${this.Type})[-]`
    }
    get modelDescription() {
        return `` +
            `[56f442]M  WS  BS   S   T   W   I    A   Ld  Cl  Wil  Int[-]\n` +
            `${this.M}   ${this.WS}   ${this.BS}  ${this.S}   ${this.T}   ${this.W}   ${this.I}  ${this.A}   ${this.Ld}  ${this.Cl}  ${this.Wil}  ${this.Int}\n` +
            `\n` +
            `[e85545]Weapons[-]\n` +
            `${this.weapons.map(w => w.toText()).join('\n')}\n` +
            `\n` +
            `[AE00FF]Wargear[-]\n` +
            `${this.wargear.join(', ')}\n` +
            `\n` +
            `[5448EB]Skills[-]\n` +
            `${this.skills.join(', ')}\n` +
            `\n` +
            `[dc61ed]Special Rules[-]\n` +
            `${this.rules.join('\n')}`
    }

    toBlob() {
        return new Blob([`${this.modelName}\n\n${this.modelDescription}\n`])
    }
    saveFile() {
        saveAs(this.toBlob(), `${this.Name}.txt`)
    }
}

// This *currently* isn't slow enough to warrant being made async, but the code would allow it
const gangers = $(".gang-ganger-card")
        .slice(0, -1)
        .toArray()
        .map(e => new Ganger(e))

const saveAll = () => {
    const zip = new JSZip()

    gangers.forEach(g => zip.file(`${g.Name}.txt`, g.toBlob()))
    zip.generateAsync({type:"blob"})
        .then(b => saveAs(b, "export.zip"))
}

function markLastClicked(e) {
    const button = $(this)
    const span = button.find('span')

    span
        .fadeOut(100, () => span.text('✔️ Copied').fadeIn(100))

    button
        .addClass('last-pressed-button')
        .parent()
        .addClass('force-visible')

    setTimeout(() => {
        button
            .removeClass('last-pressed-button')
            .parent()
            .removeClass('force-visible')
        span
            .fadeOut(100, () => span.text(e.data.oldText).fadeIn(100))
    }, 2000)
}

const createCardToolbar = i => {
    const toolbar = $(`<div>`)
        .addClass('card-toolbar')

    $('<button><span>Copy Name</span></button>')
        .on('click', () => navigator.clipboard.writeText(gangers[i].modelName))
        .on('click', { oldText: 'Copy Name' }, markLastClicked)
        .appendTo(toolbar)

    $('<button><span>Copy Description</span></button>')
        .on('click', () => navigator.clipboard.writeText(gangers[i].modelDescription))
        .on('click', { oldText: 'Copy Description' }, markLastClicked)
        .css("border-right", "1px #636363 solid")
        .css("border-left", "1px #636363 solid")
        .appendTo(toolbar)

    $('<button>')
        .text('Download')
        .on('click', () => gangers[i].saveFile())
        .appendTo(toolbar)

    return toolbar
}

(function() {
    'use strict';

    const button = $("<button>Export all as .txt files</button>")
        .addClass('export-all-button')
        .on('click', saveAll)

    $('head').append(styleTag)
    $('body').append(button)
    $(".gang-ganger-card")
        .slice(0, -1)
        .append(createCardToolbar)
})();
