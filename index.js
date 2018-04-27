const puppeteer = require('puppeteer')

const maxAttempts = 5
const waitOptions = {waitUntil: 'networkidle0'}
const coxUrl = 'https://www.cox.com/residential/home.html'
const coxDataUsageUrl = 'https://www.cox.com/internet/mydatausage.cox'

const signInLinkSelector = '#pf-signin-trigger'
const usernameFieldSelector = '#pf-username'
const passwordFieldSelector = '#pf-password'
const submitLinkSelector = '.pf-sign-in-submit-form'

const firstModemSelector = '.ubm-details.modem-no-0'
const dataUsedPercentageSelector = `${firstModemSelector} .data-used-per`
const dataUsedSelector = `${firstModemSelector} .data-used`

const typingDelay = 100

const run = async (username, password) => {
    let attempts = 0;

    let browser
    while (attempts < maxAttempts) {
        try {
            browser = await puppeteer.launch({headless: true})
            const page = await browser.newPage()
            await page.goto(coxUrl, waitOptions)

            await signIn(page, username, password)
            const [raw, percentage] = await loadDataUsage(page)
            console.log(`Usage: ${raw}, Percentage: ${percentage}`)

            process.exit(0)
        } catch (e) {
            if (++attempts === maxAttempts) {
                throw e
            } else {
                console.error(`Attempt ${attempts} failed.`, e)
            }
        } finally {
            await browser.close()
        }
    }
}

const signIn = async (page, username, password) => {

    const response = await Promise.all([
        page.waitForSelector(passwordFieldSelector),
        page.waitForSelector(usernameFieldSelector),
        page.click(signInLinkSelector)
    ])
    // Not sure why, but the first time trying to type in a field doesn't work
    await page.focus(passwordFieldSelector)
    await page.type(passwordFieldSelector, password, {delay: typingDelay})

    await page.focus(usernameFieldSelector)
    await page.type(usernameFieldSelector, username, {delay: typingDelay})

    await page.focus(passwordFieldSelector)
    await page.type(passwordFieldSelector, password, {delay: typingDelay})

    return Promise.all([
        page.waitForNavigation(waitOptions),
        page.click(submitLinkSelector)
    ])

}

const querySelector = selector => {
    return document.querySelector(selector).innerText
}

const loadDataUsage = async page => {
    await page.goto(coxDataUsageUrl, waitOptions)
    await page.waitForSelector(firstModemSelector)

    const dataUsed = await page.evaluate(querySelector, dataUsedSelector);
    const dataUsedPer = await page.evaluate(querySelector, dataUsedPercentageSelector);

    return Promise.resolve([dataUsed, dataUsedPer])
}

const args = process.argv
if (args.length !== 4) {
    throw "Usage: node index.js <username> <password>"
}

try {
    run(args[2], args[3])
} catch (e) {
    throw e
}
