#!/usr/bin/env node
"use strict";

var ow = require('../index.js');

ow.search('DanIV-21904')
    .then((data) => console.dir(data, {depth : 3, colors : true}) );

ow.getAll('pc', 'eu', 'DanIV-21904', true, 'de-de')
    .then((data) => console.dir(data, {depth : 2, colors : true}) );

//// Special characters
ow.getAll('pc', 'us', 'DanIV-21904')
    .then((data) => console.dir(data, {depth : 2, colors : true}) );
