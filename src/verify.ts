import axios from 'axios';
import fs from 'fs';
import {getArchiveUrl} from './waybackmachine';

const URL_LIST_JSON = './url_list.json';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const main = async () => {
    const urlList: {
        url: string;
        archiveUrl: string | null;
        isSaved: boolean;
    }[] = JSON.parse(fs.readFileSync(URL_LIST_JSON, {encoding: 'utf-8'}));

    const saveJson = () => fs.writeFileSync(URL_LIST_JSON, JSON.stringify(urlList, null, 2));

    // 落ちても進捗は保存する
    ['SIGINT', 'SIGQUIT', 'SIGTERM'].forEach(eventName => process.on(eventName, () => {
        saveJson();
        console.log('Stop.');
        process.exit();
    }));

    const allEntries = urlList.length;
    for (const [index, {url, archiveUrl}] of urlList.entries()) {
        if (archiveUrl === null) {
            continue;
        }
        await sleep(1000);
        console.log(`${index + 1} / ${allEntries}`);
        try {
            const [_archiveUrl, checkOrig] = await Promise.all([getArchiveUrl(url, 'Identity'), axios.head(archiveUrl).catch(e => e)]);
            if (checkOrig.status === 200) {
                continue;
            }
            if (_archiveUrl === null) {
                urlList[index].isSaved = false;
                urlList[index].archiveUrl = null;
                saveJson();
                console.log(`Can't get archive URL via Available API: ${url}`);
                continue;
            }
            const check = await axios.head(_archiveUrl).catch(e => e);
            if (check.status === 404) {
                urlList[index].isSaved = false;
                urlList[index].archiveUrl = null;
                saveJson();
                console.log(`Head request error: ${url}`);
                continue;
            }

            if (archiveUrl !== _archiveUrl) {
                urlList[index].archiveUrl = _archiveUrl;
                saveJson();
                console.log(`Update archive URL: ${_archiveUrl}`);
                continue;
            }
        }
        catch (e) {
            console.log(`Error: ${url}`);
            console.log(e);
            continue;
        }        
    }

    saveJson();
    console.log('Done.');
};

main();
