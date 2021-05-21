#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));

const { Scrape } = require('./components/Scrape.js')

function pe() {
    const lobbyScrape = new Scrape("template-pe")

    lobbyScrape.run()
        .catch()
}

function sk() {
    const saskatchewan = new Scrape("template-sk")

    saskatchewan.run().catch()
}

function ns() {
    const ns = new Scrape("template-ns")

    ns.run().catch()
}

const nb = async function() {
    const newbrunswick = await new Scrape("template-nb")

    const customFunction = async function(page) {
        await Promise.all([
            page.click('#_ctl4_btnSubmit'),
            page.waitForNavigation()
        ])
    }

    newbrunswick.customUrlCode = customFunction

    newbrunswick.run().catch()
}

const ab = async function() {
    const alberta = await new Scrape("template-ab")
    alberta.run().catch()
}

const bc = async function() {
    const bc = await new Scrape("template-bc")
    bc.run().catch()
}

const example = async function() {
    const example = await new Scrape("template-example")
    example.run().catch()
}

const mb = async function() {

    const mb = await new Scrape("template-mb")

    const customFunction = async function(page) {

        const searchButton = '#publicReportForm > div > table > tbody > tr:nth-child(11) > td > a'
        const registrationRole = '#publicReportForm_form_registrationRole'
        const registrationStatus = '#publicReportForm_form_registrationStatus'

        await page.$eval(registrationRole, el => el.value = "all")
        await page.$eval(registrationStatus, el => el.value = "active")

        await Promise.all([
            page.click(searchButton),
            page.waitForNavigation({ waitUntil: 'networkidle0' })
        ])

    }

    mb.customCode = customFunction
    

    mb.run().catch()
}

const nl = async function() {

    const nl = await new Scrape("template-nl")

    const customFunction = async function(page) {

        // await page.keyboard.press('Enter')
        // await page.waitForSelector("#tblMain > tbody > tr > td:nth-child(1) > table > tbody > tr > td > table > tbody > tr:nth-child(2) > td:nth-child(1) > a")

        await Promise.all([
            page.click('#tblMain > tbody > tr > td:nth-child(1) > table > tbody > tr > td > table > tbody > tr:nth-child(2) > td:nth-child(1) > a'),
            page.waitForNavigation()
        ])

        await Promise.all([
            page.click('#btnSearchAll'),
            page.waitForNavigation()
        ])
    }

    nl.customCode = customFunction
    

    nl.run().catch()
}

eval(argv._[1]+"()")
