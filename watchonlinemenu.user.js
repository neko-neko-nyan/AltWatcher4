// ==UserScript==
// @name         WatchOnlineMenu
// @namespace    https://openuserjs.org/users/Pasha13666
// @version      4.1.4
// @description  [shikimori.org] Добавляет ссылки на сайты просмотра аниме
// @author       Pasha13666
// @match        http://shikimori.one/*
// @match        https://shikimori.one/*
// @match        http://shikimori.org/*
// @match        https://shikimori.org/*
// @match        https://plashiki.online/*
// @match        https://*.shikimorilive.top/*
// @updateURL    https://openuserjs.org/meta/Pasha13666/WatchOnlineMenu.meta.js
// @homepageURL  https://github.com/Pasha13666/AltWatcher4
// @run-at       document-body
// @license      MIT
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_log
// @grant        GM_xmlhttpRequest
// @connect      anime365.ru
// @connect      smotret-anime-365.ru
// @connect      raw.githubusercontent.com
// @copyright    2019, Pasha13666 (https://openuserjs.org/users/Pasha13666)
// ==/UserScript==

/* div.watch-online-placeholer (from shiki) - $ph
 *   div.watch-online - $wo
 *     a.b-link_button.aw4-link - $link
 *     a.b-link_buttin.aw4-hider - $hider
 *     div.clearfix - $clearfix
 *   div.block - $bar
 *     a.b-link_button.watch-online
 *     ...
 *     div.watch-online.block.aw4-langs - $langs
 *       a.b-link_button.aw4-lang - $ru
 *       a.b-link_button.aw4-lang - $en
 */
function WatchOnlineMenu(services) {
    this.services = services;

    this.$ph = document.getElementsByClassName('watch-online-placeholer')[0];
    this.$wo = document.createElement('div')
    this.$link = document.createElement('a');
    this.$hider = document.createElement('a');
    this.$clearfix = document.createElement('div')
    this.$bar = document.createElement('div')
    this.$langs = document.createElement('div')
    this.$ru = document.createElement('a');
    this.$en = document.createElement('a');

    this.$link.target = "_blank";
    this.$ru.title = 'Искать по русскому названию';
    this.$en.title = 'Искать по английскому названию';

    this.$hider.innerText = "▼";
    this.$ru.innerText = 'ru';
    this.$en.innerText = 'en';

    this.$link.classList = "b-link_button dark aw4-link"
    this.$wo.classList = "watch-online";
    this.$clearfix.classList = "clearfix";
    this.$hider.classList = "b-link_button dark aw4-hider";
    this.$bar.classList = "block";
    this.$ru.classList = "b-link_button aw4-lang";
    this.$en.classList = "b-link_button aw4-lang";
    this.$langs.classList = "block watch-online aw4-langs";

    if (GM_getValue("searchLang", 'ru') === 'ru') this.$ru.classList.add('dark');
    else this.$en.classList.add('dark');

    this.isHentai = document.querySelector('a.b-tag[href*="genre/12"]') != null;

    for (var i = 0; i < this.services.length; i++) {
        var v = this.services[i];
        if (this.isHentai? v.forRx: v.forNotRx)
            this.$bar.appendChild(this.createPlayerButton(v, i));
    }

    this.redrawButton();

    this.$ru.addEventListener('click', () => {
        this.$ru.classList.add('dark');
        this.$en.classList.remove('dark');
        GM_setValue("searchLang", 'ru');
        this.redrawButton();
    });

    this.$en.addEventListener('click', () => {
        this.$en.classList.add('dark');
        this.$ru.classList.remove('dark');
        GM_setValue("searchLang", 'en');
        this.redrawButton();
    });

    this.$hider.addEventListener('click', () => {
        this.$bar.style.display = this.$bar.style.display === 'none'? '': 'none';
    });

    this.$langs.appendChild(this.$ru);
    this.$langs.appendChild(this.$en);
    this.$bar.appendChild(this.$langs);
    this.$wo.appendChild(this.$link);
    this.$wo.appendChild(this.$hider);
    this.$wo.appendChild(this.$clearfix);
    this.$ph.appendChild(this.$wo);
    this.$ph.appendChild(this.$bar);
}

WatchOnlineMenu.prototype.createPlayerButton = function(service, id){
    var a = document.createElement('a');
    a.classList = "b-link_button dark watch-online";
    a.innerText = service.description || service.name;
    a.addEventListener('click', () => {
        GM_setValue(this.isHentai? "currentRxServiceId": "currentServiceId", id);
        this.redrawButton();
    });
    return a;
}

WatchOnlineMenu.prototype.redrawButton = function(){
    var service = this.services[GM_getValue(this.isHentai? "currentRxServiceId": "currentServiceId", 0)];
    this.$link.innerText = 'Смотреть на ' + service.name;
    this.$link.href = this.createServiceUrl(service);
    this.$bar.style.display = 'none';
}

WatchOnlineMenu.prototype.createServiceUrl = function(service){
    //Поменять местами чтобы открывалась первая серия если крайняя еще не вышла
    //const epTotal = parseInt(this.$ph.dataset.episodes_aired);
    const epTotal = parseInt(this.$ph.dataset.total_episodes);
    const v = document.getElementsByClassName('current-episodes')[0];
    const epWatched = (v? parseInt(v.innerText): 0) || 0;
    const epNext = epWatched === epTotal? 1: (epWatched + 1);
    const animeName = document.querySelector("#animes_show > section > div > header > h1").innerText.split(" / ");
    const isEnglish = GM_getValue("searchLang", 'ru') == 'en';

    const data = {
        id: location.pathname.replace(/^\/animes\/([^-]+)-.*$/, "$1"),
        link: location.href,
        nextEpisode: epNext,
        englishName: animeName[1],
        russianName: animeName[0],
        localezedName: animeName[+isEnglish],
        localizedEpisode: isEnglish? 'episode': 'серия'
    };

    return location.protocol + "//" + service.url.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, name) => encodeURIComponent(data[name]));
}

function checkUpdates(){
    const servicesCache = GM_getValue("servicesCache", null);
    if (servicesCache && servicesCache.date > new Date()) return Promise.resolve(servicesCache.services);

    GM_log("[WatchOnlineMenu] Updating services list...");
    return new Promise(function (res, rej){
        GM_xmlhttpRequest({
            "method": "GET",
            "url": "https://raw.githubusercontent.com/Pasha13666/AltWatcher4/version-" + GM_info.script.version.substring(0, 3) + "/services.json",
            "responseType": "json",
            "fetch": true,
            "onerror": function (){
                if (servicesCache) res(servicesCache.services);
                else GM_log("[WatchOnlineMenu] Not starting WatchOnlineMenu due to network error.");
            },
            "onload": function(obj){
                if (obj.status !== 200  || !obj.response) {
                    if (servicesCache) res(servicesCache.services);
                    else GM_log("[WatchOnlineMenu] Not starting WatchOnlineMenu due to network error.");
                } else {
                    GM_setValue("servicesCache", {services: obj.response, date: +new Date() + 1000 * 60 * 60 * 24});
                    res(obj.response)
                }
            }
        });
    });
}

document.head.appendChild(GM_addStyle(
        ".aw4-lang {width: 50%; min-width: unset; float: left; }\n" +
        ".aw4-langs {top: 5px; }\n" +
        ".aw4-link {float: left; width: calc(100% - 32px); text-overflow: unset; padding-right: 0; padding-left: 0; }\n" +
        ".aw4-hider {width: 32px; float: right; min-width: unset; padding-left: 0; padding-right: 0; }\n"
));

if (location.host === 'plashiki.online'){
    unsafeWindow.corsAjax = function (){
        GM_log('[WatchOnlineMenu] PlaShiki xhr:', Array.prototype.slice.call(arguments));
        return GM_xmlhttpRequest.apply(this, arguments);
    }
    const us = unsafeWindow.USERSCRIPT = {
        name: GM_info.script.name,
        author: GM_info.script.author,
        version: "0.9.0",
        realVersion: GM_info.script.version
    }
    unsafeWindow.USERSCRIPT_VERSION = us.version + ' | Режим совместимости | ' + us.name + ' v' + us.realVersion;

} else if (location.host.substr(location.host.length - 17) === 'shikimorilive.top') {
    unsafeWindow.SLiveVersion = '1.5';

} else if (location.host === 'shikimori.one' || location.host === 'shikimori.org') {
    checkUpdates()
        .then(function(services){
            GM_log("[WatchOnlineMenu] Starting...");
            let start = function(){
                if (document.body && document.body.classList.contains("p-animes") && !document.getElementsByClassName('aw4-link').length) {
                    new WatchOnlineMenu(services);
                }
            }
            document.addEventListener('ready', start);
            document.addEventListener('page:load', start);
            document.addEventListener('turbolinks:load', start);
            start();
        })
}
