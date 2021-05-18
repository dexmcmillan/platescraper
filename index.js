const { Scrape } = require('./components/Scrape.js')

function pei() {
    const lobbyScrape = new Scrape("lobbying")

    const url = "https://www.princeedwardisland.ca/en/feature/lobbyist-registry#/service/Lobbyist/Lobbyist;lobbyist_name=null;company=null;client=null;target=null;lobbyist_type=null;status=1;wdf_url_query=true;sid=null;page_num=1;page_count=1;finished=0"
    const selector = ".table > tbody:nth-child(2) > tr > td:nth-child(1) > a:nth-child(1)"

    lobbyScrape.urls(url, selector)
        .then(res => {
            console.log("Done scraping urls!")
            return lobbyScrape.run(res)
        })
        .then(res => {
            const timeFinished = new Date()
            console.log(`Scrape done! Finished at ${timeFinished.toLocaleString()}`)
            lobbyScrape.save_stream.write(res)
        })
        .catch()
}

function sask() {
    const lobbyScrape = new Scrape("sask-lobbying")

    lobbyScrape.run()
        .then(res => {
            const timeFinished = new Date()
            console.log(`Scrape done! Finished at ${timeFinished.toLocaleString()}`)
            lobbyScrape.save_stream.write(res)
        })
        .catch()
}

const doctor = async function() {
    const doctorScrape = await new Scrape("doctor")

    doctorScrape.run()
        .then(res => {
            const timeFinished = new Date()
            console.log(`Scrape done! Finished at ${timeFinished.toLocaleString()}`)
            doctorScrape.save_stream.write(res)
        })
        .catch()
}

pei()