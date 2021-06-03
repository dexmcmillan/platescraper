#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));

const { Scrape } = require('./components/Scrape.js')

const example = async function() {
    const example = await new Scrape("template-example")
    example.run().catch()
}


eval(argv._[1]+"()")
