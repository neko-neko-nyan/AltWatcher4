// ==UserScript==
// @name         WatchOnlineMenu
// @namespace    https://openuserjs.org/users/Pasha13666
// @version      4.0.2
// @description  [shikimori.org] Добавляет ссылки на сайты просмотра аниме
// @author       NekoNekoNyan
// @match        http://shikimori.one/*
// @match        https://shikimori.one/*
// @match        http://shikimori.org/*
// @match        https://shikimori.org/*
// @updateURL    https://github.com/Pasha13666/AltWatcher4/raw/master/watchonlinemenu.user.js
// @homepageURL  https://github.com/Pasha13666/AltWatcher4
// @run-at       document-body
// @license      MIT
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_log
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @copyright    2019, NekoNekoNyan (https://openuserjs.org/users/Pasha13666)
// ==/UserScript==

(function(){
    "use strict";

    // ==== New elements ====
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
        var url = location.protocol + "//" + service.url;
        switch (service.search) {
            case "name":
                url += encodeURIComponent(this.getAnimeName(service));
                break;
            case "link":
                url += encodeURIComponent(location.href);
                break;
            case "id":
                url += location.pathname.replace(/^\/animes\/([\d+z]+)-.*$/, "$1");
                break;
            case "dle":
                url += "/?do=search&subaction=search&story=" + encodeURIComponent(this.getAnimeName(service));
                break;
        }
        return url;
    }

    WatchOnlineMenu.prototype.getAnimeName = function (service){
        //Поменять местами чтобы открывалась первая серия если крайняя еще не вышла
        //var epTotal = parseInt(this.$ph.dataset.episodes_aired);
        var epTotal = parseInt(this.$ph.dataset.total_episodes);
        var v = document.getElementsByClassName('current-episodes')[0];
        var epWatched = (v? parseInt(v.innerText): 0) || 0;
        var epNext = epWatched === epTotal? 1: (epWatched + 1);
        var searchLang = GM_getValue("searchLang", 'ru');

        var isEnglish = searchLang === "en";

        if (service.forceLang === "en")
            isEnglish = true;
        else if (service.forceLang === "ru")
            isEnglish = false;

        var animeName = document.querySelector("#animes_show > section > div > header > h1").innerText.split(" / ")[+isEnglish];
        if (service.addEpisode){
            animeName += " " + epNext;
            if (service.episodeWord) {
                var isEnglishEW = searchLang === "en";

                if (service.episodeWord === "en")
                    isEnglishEW = true;
                else if (service.episodeWord === "ru")
                    isEnglishEW = false;

                animeName += " " + (isEnglishEW? "episode": "серия");
            }
        }

        return animeName;
    }

    document.head.appendChild(GM_addStyle(
            ".aw4-lang {width: 50%; min-width: unset; float: left; }\n" +
            ".aw4-langs {top: 5px; }\n" +
            ".aw4-link {float: left; width: calc(100% - 32px); text-overflow: unset; padding-right: 0; padding-left: 0; }\n" +
            ".aw4-hider {width: 32px; float: right; min-width: unset; padding-left: 0; padding-right: 0; }\n"
    ));

    function checkUpdates(){
        const servicesCache = GM_getValue("servicesCache", null);
        if (servicesCache && servicesCache.date < new Date()) return Promise.resolve(servicesCache.services);

        return new Promise(function (res, rej){
            GM_xmlhttpRequest({
                "method": "GET",
                "url": "https://raw.githubusercontent.com/Pasha13666/AltWatcher4/master/services.json",
                "responseType": "json",
                "fetch": true,
                "onerror": function (){
                    if (servicesCache) res(servicesCache.services);
                    else GM_log("Not starting WatchOnlineMenu due to network error.");
                },
                "onload": function(obj){
                    if (obj.status !== 200) {
                        if (servicesCache) res(servicesCache.services);
                        else GM_log("Not starting WatchOnlineMenu due to network error.");
                    } else {
                        GM_setValue("servicesCache", {services: obj.response, date: new Date(new Date() + 1000 * 60 * 60 * 24)});
                        res(obj.response)
                    }
                }
            });
        });
    }

    checkUpdates()
        .then(function(services){
            GM_log("Starting...");
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
})();
