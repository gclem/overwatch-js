# overwatch-js
NodeJS Overwatch library : Retrieve informations about heroes/players from Overwatch Official Website [Overwatch](https://playoverwatch.com)

## Functionalities
* Global profile datas
* Career profile datas with heroes statistics

## Install

#### Requirements
* Node v6.0+

```bash
npm install overwatch-js
```

## How to

Extremely simple use case. See `specs/mocktest.js`

``` javascript
var owjs = require('overwatch-js');

//// Search for a player ( you must have the exact username, if not Blizzard api will return a not found status)
owjs
    .search('Zeya-2303')
    .then((data) => console.dir(data, {depth : 2, colors : true}) );
````

```json
[ { careerLink: '/career/pc/eu/Zeya-2303',
    platformDisplayName: 'Zeya#2303',
    level: 64,
    portrait: 'https://blzgdapipro-a.akamaihd.net/game/unlocks/0x02500000000009D9.png',
    platform: 'career',
    region: 'pc',
    tier: 2 } ]
```

``` javascript
var owjs = require('overwatch-js');
//// Retrive only overall stats
owjs
    .getOverall('pc', 'eu', 'Zeya-2303')
    .then((data) => console.dir(data, {depth : 2, colors : true}) );
```

``` javascript
var owjs = require('overwatch-js');

//// Retrieve all stats, including heroes details
owjs
    .getOverall('pc', 'eu', 'Zeya-2303')
    .then((data) => console.dir(data, {depth : 2, colors : true}) );
```

Where `pc` is the platform, `eu` is the region, and `Zeya-2303` the nickname. 

## License
MIT
