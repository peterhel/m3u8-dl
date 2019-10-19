const request = require('request')
const url = require('url');
const path = require('path');
const fs = require('fs');
const makeSure = require('msjs');

const [, , playlistUrl, destfile] = process.argv;

makeSure({ playlistUrl, destfile }).has('playlistUrl').has('destfile').throw();


const urlObject = url.parse(playlistUrl);
const urlDirectory = path.dirname(urlObject.path);

const playlist = {
    url: playlistUrl,
    destination: path.basename(urlObject.path),
}

function createFolderRecurse(fullpath) {
    const segments = path.dirname(fullpath).split(path.sep);
    let current = '/';
    segments.forEach(s => {
        current = path.join(current, s);
        console.log(current);
        if (!fs.existsSync(current)) {
            fs.mkdirSync(current);
            console.log(`Folder ${current} created.`)
        }
        //console.log(current);
    });
}

function parsePlaylist(text) {
    return text.split('\n').filter(x => /^[^#]/.test(x));
}

function download(_url) {
    console.log(_url);
    const filename = _url.destination
    createFolderRecurse(path.join(process.cwd(), _url.destination));

    if (fs.existsSync(filename)) {
        return Promise.resolve(filename);
    }
    return new Promise((resolve, reject) => {
        request.get(_url.url).pipe(fs.createWriteStream(`${filename}.download`)).on('close', () => {
            fs.renameSync(`${filename}.download`, filename);
            console.log(filename, 'downloaded');
            resolve(filename);
        });
    })
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
let manifest;

function merge() {
    //# ffmpeg -i "playlist-4b2d059e84d01786e91d48717f0f72f89ca5c5f6.m3u8" -c copy "halal_1.ts"
    const spawn = require('child_process').spawn;
    const ls = spawn('ffmpeg', ['-i', manifest, '-c', 'copy', `${destfile}`]);
    ls.stdout.pipe(process.stdout);
    ls.stderr.pipe(process.stderr);
    return new Promise((resolve, reject) => {
        console.log('Downloading video stream');
        ls.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            resolve()
        });
        ls.on('error', (code) => {
            console.error(`child process exited with code ${code}`);
            reject()
        });
    });
}

function getUrl(endpoint) {
    const newPath = path.resolve(urlDirectory, endpoint);
    return {
        url: `${urlObject.protocol}//${urlObject.host}${newPath}`,
        destination: endpoint
    }
}

download(playlist).then(filename => {
        return parsePlaylist(fs.readFileSync(filename, 'utf8'));
    })
    // .then(data => {
    //     return getUrl(data[0]);
    // })
    // .then(download)
    // .then(filename => {
    //     manifest = filename;
    //     return parsePlaylist(fs.readFileSync(filename, 'utf8'));
    // })
    .then(tsFiles => {
        let promise = Promise.resolve();
        tsFiles.forEach(x => {
            promise = promise.then(() => download(getUrl(x)))
        })
        return promise;
    })
    .then(merge)



//echo $1
//curl "$1" -o lempan.m3u8
//cat lempan.m3u8 | grep 'BANDWIDTH=4856000' -A1 | tail -n 1
//
