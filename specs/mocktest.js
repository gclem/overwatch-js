#!/usr/bin/env node
"use strict";

var ow = require('../index.js');

ow.getAll('pc', 'eu', 'RapTorS-2275')
    .then((data) => console.dir(data, {depth : 2, colors : true}) );