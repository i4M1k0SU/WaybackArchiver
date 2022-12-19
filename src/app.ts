import fs from 'fs';
import process from 'process';
import {getArchiveUrl, save} from './waybackmachine';

const URL_LIST_TEXT = './url_list.txt';
const URL_LIST_JSON = './url_list.json';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const main = async () => {
    const urlList: {
        url: string;
        archiveUrl: string | null;
        isSaved: boolean;
    }[] = fs.existsSync(URL_LIST_JSON) ?
        JSON.parse(fs.readFileSync(URL_LIST_JSON, {encoding: 'utf-8'})) :
        fs.readFileSync(URL_LIST_TEXT, {encoding: 'utf-8'}).split('\n').map(l => {
            return {
                url: l,
                archiveUrl: null,
                isSaved: false
            };
        });

    // 落ちても進捗は保存する
    ['SIGINT', 'SIGQUIT', 'SIGTERM'].forEach(eventName => process.on(eventName, () => {
        fs.writeFileSync(URL_LIST_JSON, JSON.stringify(urlList));
        console.log('Stop.');
        process.exit();
    }));

    const allEntries = urlList.length;
    for (const [index, {url}] of urlList.entries()) {
        console.log(`${index + 1} / ${allEntries}`);
        // 未save・当然ArchiveURL未取得
        if (!urlList[index].isSaved) {
            console.log('Saving URL: ' + url);
            urlList[index].isSaved = await save(url);
            if (!urlList[index].isSaved) {
                console.error('Save error...');
                continue;
            }
            console.log('Save success!');
            console.log('Waiting...');
            await sleep(5000);
        }

        // save済み・ArchiveURL未取得
        if (urlList[index].isSaved && urlList[index].archiveUrl === null) {
            console.log('Get archive URL: ' + url);
            urlList[index].archiveUrl = await getArchiveUrl(url, 'Identity');
            if (urlList[index].archiveUrl === null) {
                console.error('Failed get archive URL...');
                continue;
            }
            console.log('Archive URL: ' + urlList[index].archiveUrl);
        }
    }

    fs.writeFileSync(URL_LIST_JSON, JSON.stringify(urlList));
    console.log('Done.');
};

main();
