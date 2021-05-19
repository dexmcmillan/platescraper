#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));

const { Scrape } = require('./components/Scrape.js')

function pe() {
    const lobbyScrape = new Scrape("template-pe")

    const url = "https://www.princeedwardisland.ca/en/feature/lobbyist-registry#/service/Lobbyist/Lobbyist;lobbyist_name=null;company=null;client=null;target=null;lobbyist_type=null;status=1;wdf_url_query=true;sid=null;page_num=1;page_count=1;finished=0"
    const selector = ".table > tbody:nth-child(2) > tr > td:nth-child(1) > a:nth-child(1)"

    lobbyScrape.urls(url, selector)
        .then(res => {
            console.log("Done scraping urls!")
            return lobbyScrape.run(res)
        })
        .catch()
}

function sk() {
    const saskatchewan = new Scrape("template-sk")

    saskatchewan.run().catch()
}

const nb = async function() {
    const newbrunswick = await new Scrape("template-nb")

    const url = "https://www.pxw1.snb.ca/snb9000/product.aspx?productid=A001PLOBBYSearch&l=e"
    const selector = "#ContentDeliveryDiv > table:nth-child(4) > tbody:nth-child(1) > tr:not(:first-child) > td:nth-child(6) > a:nth-child(1)"

    const customFunction = async function(page) {
        await Promise.all([
            page.click('#_ctl4_btnSubmit'),
            page.waitForNavigation()
        ])
    }

    newbrunswick.customUrlCode = customFunction

    newbrunswick.urls(url, selector)
    .then(res => {
        console.log("Done scraping urls!")
        return newbrunswick.run(res)
    }).catch()
}

const ab = async function() {
    const alberta = await new Scrape("template-ab")

    alberta.run().catch()
}

const bc = async function() {
    const bc = await new Scrape("template-bc")

    bc.run().catch()
}

eval(argv._[1]+"()")
