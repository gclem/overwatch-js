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

//// Retrive only overall stats
owjs
    .getOverall('pc', 'eu', 'Zeya-2303')
    .then((data) => console.dir(data, {depth : 2, colors : true}) );

//// Retrieve all stats, including heroes details
owjs
    .getOverall('pc', 'eu', 'Zeya-2303')
    .then((data) => console.dir(data, {depth : 2, colors : true}) );
```

Where `pc` is the platform, `eu` is the region, and `Zeya-2303` the nickname. 

## License
MIT
