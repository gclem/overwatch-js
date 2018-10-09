#!/usr/bin/env node
"use strict";

/**
 * Node.js : overwatch-js
 * Access overwatch heroes and profile informations
 *
 **/

const cheerio = require('cheerio');
const rp = require('request-promise');
const _ = require('lodash/core');

const url = 'https://playoverwatch.com/%LANG%/career/';
const searchUrl = 'https://playoverwatch.com/%LANG%/search/account-by-name/';

const GAMETYPES = ['competitive', 'quickplay'];
const PLATFORMS = {
    XboxLive: "xbl",
    Playstation: "psn",
    PC: "pc"
}
const LOCALES = [
    "de-de",
    "en-us",
    "en-gb",
    "es-es",
    "es-mx",
    "fr-fr",
    "it-it",
    "pt-br",
    "pt-pt",
    "pl-pl",
    "ru-ru",
    "ko-kr",
    "ja-jp",
    "zh-tw",
    "zh-cn"
]

const RANKS = {
    "1" : [], //// Season 1
    "2" : [  //// Season 2
        'Bronze',
        'Silver',
        'Gold',
        'Platinum',
        'Diamond',
        'Master',
        'Grandmaster',
        'Top500'
    ]
}

const TIERS = require('./registry/ranking');

let OverwatchProvider = function () {
    var self = this;

    String.prototype.sanitize = function () {
        return this.trim().replace(" - ", "_").replace(/\s/g, "_").toLowerCase();
    }

    String.prototype.toTimestamp = function () {
        if (this.indexOf(':') > 0) {
            let intervals = this.split(':').reverse();
            intervals.at0 = (idx) => intervals[idx] || 0;
            // UTC date gives us milliseconds since the unix epoch
            return Date.UTC(1970, 0, intervals.at0(3) + 1, intervals.at0(2), intervals.at0(1), intervals.at0(0));
        }

        var swap = this;
        if (swap.endsWith('s')) swap = this.substr(0, this.length - 1); // remove trailing s
        if (swap.endsWith("second")) return parseInt(swap) * 1000;
        if (swap.endsWith("minute")) return parseInt(swap) * 60000;
        if (swap.endsWith("hour")) return parseInt(swap) * 3600000;
        if (swap.endsWith("day")) return parseInt(swap) * 86400000;

        return parseInt(swap);
    }

    String.prototype.cast = function () {
        if (this.indexOf('.') > 0 && this.indexOf(',') > 0) return parseFloat(this.replace(',',''));
        if (this.indexOf('.') > 0) return parseFloat(this);
        if (this.indexOf(':') > 0 || this.split(' ').length > 1) return this.toTimestamp();
        return parseInt(this.replace(/,/g, ''));
    }

    let getAvailableLocales = () => { return LOCALES; }

    let getUrl = (platform, region, tag, lang = 'en-us') => {

        if(! LOCALES.includes(lang))
            throw new Error(`${lang}_INVALID_LOCALE`);

        switch (platform) {
            case PLATFORMS.PC:
                region = "/" + region
                break;
            case PLATFORMS.Playstation:
            case PLATFORMS.XboxLive:
            default:
                //// No region must be specified
                region = "";
                break;
        }

        return url.replace('%LANG%', lang) + `${platform}${region}/${encodeURIComponent(tag)}`;
    };

    let getSearchUrl = (nickname, lang = "en-us", encode = false) => {

        if(! LOCALES.includes(lang))
            throw new Error(`${lang}_INVALID_LOCALE`);

        return searchUrl.replace('%LANG%', lang) + (encode ? encodeURIComponent(nickname) : nickname);
    };

    let parseTiers = (img) => {
        if(!img)
            return '';

        var m = img.match(/playerlevelrewards\/(.*)_Border.png/);

        if(!m || m.length <= 1)
            return '';

        return TIERS[m[1]];
    }

    let parseProfile = ($) => {
        var stats = {};
        stats.nick = $('.header-masthead').text();
        stats.level = parseInt($('div.player-level div').first().text());
        stats.avatar = $('.player-portrait').attr('src');
        stats.rank = parseInt($('div.competitive-rank > div').first().text());
        stats.tier = parseTiers($('.player-level').attr('style').replace(/^url|[\(\)]/g, ''));

        if (stats.rank)
            stats.rankPicture = $('div.competitive-rank > img').attr('src');

        stats.platform = $('#profile-platforms > a').text();

        return stats;
    };

    let parseFeaturedStats = ($, gameType) => {
        var stats = {};

        stats.masteringHeroe = $('[data-js="heroMastheadImage"]').attr(`data-hero-${gameType}`);

        return stats;
    }

    let parseHeroesStats = ($, gametype, overallOnly = false) => {
        var heroesMap = [];
        var featuredMap = [];
        var stats = {};

        //// Master stats
        _.each($(`#${gametype} select[data-group-id='stats'] option`), (item) => {
            heroesMap.push({ name: item.attribs['option-id'].toLowerCase().sanitize(), value: item.attribs['value'] });

            if (overallOnly)
                return false;
        });

        //// Featured stats
        _.each($(`#${gametype} select[data-group-id='comparisons'] option`), (item) => {
            featuredMap.push({ name: item.attribs['option-id'].toLowerCase().sanitize(), value: item.attribs['value'] });
        });

        //// Seeking heroe datas
        _.each(heroesMap, (map) => {
            stats[map.name] = {};

            //// Carreer
            _.each($(`#${gametype} [data-category-id="${map.value}"]`), (slide) => {
                var e = $(slide);
                _.each(e.find('tbody > tr'), (stat) => {
                    stats[map.name][stat.children[0].children[0].data.sanitize()] = stat.children[1].children[0].data.cast();
                });
            });

            //// Featured
            _.each(featuredMap, (feat) => {
                _.each($(`#${gametype} [data-group-id="comparisons"][data-category-id="overwatch.guid.${feat.value}"]`), (slide) => {
                    var value = $(slide).find(`div [data-hero-guid="${map.value}"] .description`);
                    stats[map.name][feat.name.sanitize()] = value;
                });
            });

            if (overallOnly)
                return false;
        });

        return stats;
    }

    let parseAchievements = ($) => {
        var categories = [];
        var stats = {};
        var achievements = [];
        _.each($(`select[data-group-id="achievements"] option`), (item) => {
            categories.push({ name: item.attribs['option-id'].toLowerCase(), value: item.attribs['value'] });
        });

        // Seeking achievements stats
        _.each(categories, (category) => {
            var ctns  = $(`[data-category-id="${category.value}"] > ul > div`);

            _.each(ctns, (ctn) => {
                var ctn = $(ctn);
                achievements.push({
                    acquired : ctn.find('.achievement-card').attr('class').indexOf('m-disabled') < 0,
                    thumbnail : ctn.find('.media-card-fill').attr('src'),
                    title : ctn.find('.tooltip-tip > .h5').text(),
                    description : ctn.find('.tooltip-tip > .h6').text(),
                    category : category.name
                })
            });
        });

        return achievements;
    }

    let handle = (err) => {

        if (!err.response && err instanceof (Error))
            throw err;

        switch (err.response.statusCode) {
            case 404:
                throw new Error('PROFILE_NOT_FOUND');
            case 500:
                throw new Error('TECHNICAL_EXCEPTION_HTML_STRUCTURE_MAY_HAVE_CHANGED')
            case 502:
                throw new Error('TECHNICAL_EXCEPTION_NOT_REACHABLE')
            default:
                throw new Error('TECHNICAL_EXCEPTION_NOT_IDENTIFIED')
        }
    }

    self.getOverall = (platform, region, tag, lang = 'en-us') => {
        return self.get(platform, region, tag, true, lang);
    }

    self.getAll = (platform, region, tag, overallOnly, lang = 'en-us') => {
        return self.get(platform, region, tag, false, lang);
    }

    self.get = (platform, region, tag, overallOnly, lang = 'en-us') => {
        var baseurl = getUrl(platform, region, tag, lang);

        return rp(baseurl).then((context) => {

            var result = {};
            var promises = [];
            const $ = cheerio.load(context);

            //// Seeking if profile exists
            if (context.indexOf('Profile Not Found') > 0)
                throw new Error('PROFILE_NOT_FOUND');

            //// Getting profile
            var p = new Promise((resolve, reject) => {
                result.profile = parseProfile($);
                result.profile.url = baseurl;

                resolve(result);
            });
            promises.push(p);

            //// Getting stats
            _.each(GAMETYPES, (type) => {
                var p = new Promise((resolve, reject) => {
                    result[type] = {};
                    result[type].global = parseFeaturedStats($, type);
                    result[type].heroes = parseHeroesStats($, type, overallOnly);
                    result[type].global = Object.assign(result[type].global, result[type].heroes['all_heroes']);
                    delete result[type].heroes.all_heroes;

                    resolve(result);
                });
                promises.push(p);
            });

            promises.push(new Promise((resolve, reject) => {
                result.achievements = parseAchievements($);
                resolve(result);
            }));

            return Promise.all(promises).then(() => {
                return result;
            });
        })
        .catch(handle);
    };

    self.search = (username, lang = "en-us") => {

        //// Sanitize for new UI version
        username = username.replace("-", "#");

        var options = {
            uri: getSearchUrl(username, lang, true),
            headers: {
                'User-Agent': 'Overwatch-JS'
            },
            json: true
        };

        return rp(options).then((datas) => {
            _.each(datas, (player) => {
                //// Region is not longer provided in the result
                player.region = "";
                player.tier = (player.level - player.level % 100) / 100;
                player.level = player.level % 100;
            });

            return datas;
        })
            .catch(handle);
    }
};

module.exports = new OverwatchProvider();
