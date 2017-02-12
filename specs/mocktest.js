#!/usr/bin/env node
"use strict";

var ow = require('../index.js');

ow.search('Zeya-2303')
    .then((data) => console.dir(data, {depth : 3, colors : true}) );

ow.getAll('pc', 'eu', 'Zeya-2303')
    .then((data) => console.dir(data, {depth : 2, colors : true}) );