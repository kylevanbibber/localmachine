var express = require('express');
var router = express.Router();
const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const axios = require('axios');

const fetchData = async () => {
  const url = 'https://icmail.globelifeinc.com/reporting/index.html?L_ReportID=163';
  const username = 'kvanbibber@ariasagencies.com';
  const password = 'Sunday5300!';

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url);

  // Check if page is login page
  if (page.url().includes('login.html')) {
    await page.type('input[name="j_username"]', username);
    await page.type('input[name="j_password"]', password);
    await page.click('#login_button');
    await page.waitForNavigation({ timeout: 15000 });
  }

  // Get table data
  const tableData = await page.$$eval('.DataGridDiv tr', rows => {
    const lostBusinessIndex = rows.findIndex(row => row.innerText.trim() === 'Lost Business');
    if (lostBusinessIndex === -1) {
      throw new Error('Could not find "Lost Business" section on the page');
    }
    return rows.slice(lostBusinessIndex).map(row => {
      const columns = row.querySelectorAll('td');
      return Array.from(columns).map(column => column.innerText);
    });
  });

  await browser.close();

  return tableData;
};

router.get('/fetch-data', async (req, res) => {
  try {
    const data = await fetchData();

    // Write data to CSV file
    const csvWriter = createCsvWriter({
      path: 'data.csv',
      header: data[0].map((header) => ({ id: header, title: header })),
    });
    await csvWriter.writeRecords(data.slice(1).map((row) => {
      return row.reduce((record, value, index) => {
        record[data[0][index]] = value;
        return record;
      }, {});
    }));

    // Send data to API endpoint
    const response = await axios.post('http://pocketarcbackend-env.eba-jdzpbb84.us-east-2.elasticbeanstalk.com/', { data });

    res.json({ success: true, message: 'Data fetched and sent to API endpoint.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An error occurred while fetching data.' });
  }
});

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;












