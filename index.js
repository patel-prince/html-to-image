const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");
const fs = require("fs");
const fsp = require("fs").promises;
const csv = require("csv-parser");
const { Client, MessageMedia, Location } = require("@juzi/whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));

const client = new Client();

client.on("ready", async () => {
  console.log("Client is ready!");

  console.log("Reading CSV file");
  const persons = [];
  await fs
    .createReadStream("persons.csv")
    .pipe(csv())
    .on("data", (data) => persons.push(data))
    .on("end", async () => {
      const browser = await puppeteer.launch({ product: "chrome" });
      const files = await fsp.readdir("images");

      console.log("Deleting old images");
      // delete all files in the images folder
      for (const file of files) {
        await fsp.unlink(`images/${file}`);
      }

      console.log("Creating new images");
      for (const person of persons) {
        const page = await browser.newPage();
        await page.goto(`http://localhost:3000/invitation/${person.name}`);
        page.setViewport({ width: 3200, height: 4400 });
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const screenshot = await page.screenshot({ encoding: "binary" });
        const filename = person.name?.toLowerCase().replace(/ /g, "-");
        const filenamePath = `images/${filename}.png`;

        await fsp.writeFile(filenamePath, screenshot);
        console.log(`Image Create For ${person.name}`);

        const media = MessageMedia.fromFilePath(filenamePath);
        const location = new Location(23.120986, 72.6535168);

        await client.sendMessage(
          `91${person.phone}@c.us`,
          "B-104, The Riverside, Karai Gam Road, Nana Chiloda, Ahmedabad, Gujarat 382330",
          { media }
        );
        const message = await client.sendMessage(
          `91${person.phone}@c.us`,
          location
        );
        console.log(message);
        console.log(`Invitation Sent to ${person.name}`);
        await page.close();
      }
      await browser.close();
    });
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

app.get("/invitation/:name", async (req, res) => {
  res.render("invitation", {
    name: req.params.name,
  });
});

app.get("/invite", async (req, res) => {
  client.initialize();
  res.send("Images generated successfully");
});

app.listen(3000, () => console.log("Server started on port 3000"));
