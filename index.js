const { Scrape } = require('./components/Scrape.js')
const fs = require('fs')

const doctorScrape = new Scrape("lobbying")

doctorScrape.urls()
    .then(res => doctorScrape.save_stream.write(res))



