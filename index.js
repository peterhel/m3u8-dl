const request = require('request')
const url = require('url');
const path = require('path');
const fs =require('fs');
const [, , playlist] = process.argv;

const urlObject = url.parse(playlist);
const urlDirectory = path.dirname(urlObject.path);
console.log(urlObject);

function parsePlaylist(text) {
    return text.split('\n').filter(x => /^[^#]/.test(x));
}
function download(_url){
  return new Promise((resolve, reject) => {
    const filename=path.basename(url.parse(_url).path)
      request.get(_url).pipe(fs.createWriteStream(filename)).on('close', resolve);
  })
  console.log(url);
  return Promise.resolve();
}
function fetchPlaylist(url) {
    return new Promise((resolve, reject) => {
        request.get(url, (err, res, body) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(parsePlaylist(body))
        });
    })
}

function getUrl(endpoint) {
    const newPath = path.resolve(urlDirectory, endpoint);
    return `${urlObject.protocol}//${urlObject.host}${newPath}`
}

fetchPlaylist(playlist)
    .then(data => {
        return getUrl(data[0]);
    })
    .then(fetchPlaylist)
    .then(tsFiles => {
        let promise = Promise.resolve();
        tsFiles.forEach(x => {
            promise = promise.then(new Promise((resolve, reject) => {
                return download(getUrl(x))
            }))
        })
    })



//echo $1
//curl "$1" -o lempan.m3u8
//cat lempan.m3u8 | grep 'BANDWIDTH=4856000' -A1 | tail -n 1
//
//# ffmpeg -i "playlist-4b2d059e84d01786e91d48717f0f72f89ca5c5f6.m3u8" -c copy "halal_1.ts"
