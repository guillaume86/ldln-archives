const fetch = require("node-fetch");
const { readFile, writeFile } = require("fs/promises");

function substitute(text, vars) {
  return Object.keys(vars).reduce(
    (text, name) => text.replace(new RegExp("\\" + name, "g"), vars[name]),
    text
  );
}

const getPlayerURL = (uuid) =>
  "https://www.franceinter.fr/embed/player/aod/" + uuid;

async function buildRssFeed() {
  const data = JSON.parse(await readFile("./data.json", { encoding: "utf8" }));
  const template = await readFile("./template.rss", { encoding: "utf8" });
  const startItem = template.indexOf("$item:start");
  const endItem = template.indexOf("$item:end");
  const itemTemplate = template.substring(
    startItem + "$item:start".length,
    endItem
  );

  const sections = [
    substitute(template.substr(0, startItem), {
      $lastBuildDate: new Date().toString(),
    }),
  ];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    console.log(`${i + 1}/${data.length} - ${item.title}`);

    const playerURL = getPlayerURL(item.uuid);
    const playerRes = await fetch(playerURL);
    const playerHTML = await playerRes.text();

    const m = /data\-url\=\"(.+?)\"/.exec(playerHTML);
    const fileURL = m[1];

    sections.push(
      substitute(itemTemplate, {
        $title: item.title,
        $uuid: item.uuid,
        $pubDate: new Date(item.startTime * 1000).toString(),
        $url: fileURL,
      })
    );
  }

  sections.push(template.substr(endItem + "$item:end".length));

  const rss = sections.join("\r\n");
  await writeFile("output.rss", rss, { encoding: "utf-8" });
}

buildRssFeed().catch((err) => console.error(err));
