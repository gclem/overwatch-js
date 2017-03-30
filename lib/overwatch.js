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

const url = 'https://playoverwatch.com/en-us/career/';
const searchUrl = 'https://playoverwatch.com/en-us/search/account-by-name/';

const GAMETYPES = ['competitive', 'quickplay'];
const PLATFORMS = {
    XboxLive : "xbl",
    Playstation : "psn",
    PC : "pc"
}

let OverwatchProvider = function() {
    var self = this;

    String.prototype.sanitize = function() {
        return this.trim().replace(" - ", "_").replace(/\s/g, "_").toLowerCase();
    }

    String.prototype.toTimestamp = function() {
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
        if (swap.endsWith("hour"))   return parseInt(swap) * 3600000;
        if (swap.endsWith("day"))    return parseInt(swap) * 86400000;

        return parseInt(swap);
    }

    String.prototype.cast = function() {
        if (this.indexOf('.') > 0) return parseFloat(this);
        if (this.indexOf(':') > 0 || this.split(' ').length > 1) return this.toTimestamp();
        return parseInt(this.replace(/,/g,''));
    }

    let getUrl = (platform, region, tag) => {

        switch(platform)
        {
            case PLATFORMS.PC : 
                region = "/" + region
                break;
            case PLATFORMS.Playstation : 
            case PLATFORMS.XboxLive :
            default : 
                //// No region must be specified
                region = "";
                break;
        }    

        return url + `${platform}${region}/${tag}`;
    };

    let getSearchUrl = (nickname) => {
        return searchUrl + nickname;
    };

    let parseProfile = ($) => {
        var stats = {};
        stats.nick = $('.header-masthead').text();
        stats.level = parseInt($('div.player-level div').first().text());
        stats.avatar = $('.player-portrait').attr('src');
        stats.rank = parseInt($('div.competitive-rank > div').first().text());

        if(stats.rank)
            stats.rankPicture = $('div.competitive-rank > img').attr('src');
        
        stats.platform = $('#profile-platforms > a').text();

        return stats;
    };

    let parseFeaturedStats = ($, gameType) => {
        var stats = {};
        _.each($(`#${gameType} > section.highlights-section div.card-content`), (item) => {
            var item = $(item);
            stats[item.find('.card-copy').text().sanitize()] = item.find('.card-heading').text().cast();
        });

        return stats;
    }

    let parseHeroesStats = ($, gametype, overallOnly = false) => {
        var heroesMap = [];
        var stats = {};
        _.each($(`#${gametype} > .career-stats-section option`), (item) => {
            heroesMap.push({ name : item.attribs['option-id'].toLowerCase().sanitize(), value : item.attribs['value'] });

            if(overallOnly)
                return false;
        });

        //// Seeking heroe datas
        _.each(heroesMap, (map) => {
            stats[map.name] = {};

            _.each($(`#${gametype} [data-category-id="${map.value}"]`), (slide) => {
                var e = $(slide);
                _.each(e.find('tbody > tr'), (stat) => {
                    stats[map.name][stat.children[0].children[0].data.sanitize()] = stat.children[1].children[0].data.cast();
                });
            });

            if(overallOnly)
                return false;
        });

        return stats;
    }

    let handle = (err) => {
        console.log(err);
        switch (err.response.statusCode) {
            case 404 :
                throw new Error('PROFILE_NOT_FOUND'); 
                break;
            case 500 : 
                throw new  Error('TECHNICAL_EXCEPTION_HTML_STRUCTURE_MAY_HAVE_CHANGED')
                break;
            default : 
                throw new Error('TECHNICAL_EXCEPTION_NOT_IDENTIFIED')
                break;
        }
    }

    self.getOverall = (platform, region, tag) => {
        return self.getAll(platform, region, tag, true);
    }

    self.getAll = (platform, region, tag, overallOnly) => {
        var baseurl = getUrl(platform, region, tag);
        return rp(baseurl).then((context) => {

            var result = {};
            var promises = [];
            const $ = cheerio.load(context);

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

            return Promise.all(promises).then(() => {
                return result;
            });
        })
        .catch(handle);
    };

    self.search = (username) => {
        var options = {
            uri: getSearchUrl(username),
            json: true 
        };

        return rp(options).then((datas) => {
            _.each(datas, (player) => {
                var i = player.careerLink.split('/');
                player.platform = i[1];
                player.region = i[2];
                player.tier = (player.level - player.level % 100) / 100;
                player.level = player.level % 100;
            });

            return datas;
        })
        .catch(handle);
    }
};

module.exports = new OverwatchProvider();
