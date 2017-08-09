#!/usr/bin/env node
"use strict";

var ow = require('../index.js');

ow.search('SĔNPAI-1698')
    .then((data) => console.dir(data, {depth : 3, colors : true}) );

ow.getAll('pc', 'eu', 'Zeya-2303', true, 'de-de')
    .then((data) => console.dir(data, {depth : 2, colors : true}) );

//// Special characters
ow.getAll('pc', 'us', 'SĔNPAI-1698')
    .then((data) => console.dir(data, {depth : 2, colors : true}) );
