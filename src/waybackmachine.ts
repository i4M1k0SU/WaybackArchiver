import axios from 'axios';

const SAVE_PREFIX = 'https://web.archive.org/save/';
const AVAILABLE = 'https://archive.org/wayback/available';

type ArchiveUrlMode = 'Default' | 'Identity' | 'JavaScript' | 'CSS' | 'Image' | 'Iframe';

const ARCHIVE_URL_MODE: {[key in ArchiveUrlMode]: string} = {
    Default: '',
    Identity: 'id_',
    JavaScript: 'js_',
    CSS: 'cs_',
    Image: 'im_',
    Iframe: 'if_'
};

type AvailableResponse = {
    url: string;
    archived_snapshots: {
        closest?: {
            available: boolean;
            url: string;
            timestamp: string; // numberではない
            status: string; // numberではない
        };
    };
};

export const save = async (url: string): Promise<boolean> => {
    const response = await axios.get(SAVE_PREFIX + url).catch(() => null);

    if (response === null || response.status !== 200) {
        return false;
    }

    return true;
};

export const getArchiveUrl = async (url: string, mode: ArchiveUrlMode = 'Default'): Promise<string | null> => {
    const response = await axios.get<AvailableResponse>(AVAILABLE, {
        params: {url}
    }).catch(() => null);

    if (response === null || response.status !== 200) {
        return null;
    }

    const closest = response.data.archived_snapshots.closest;

    if (!closest || !closest.available || closest.status !== '200') {
        return null;
    }

    if (mode === 'Default') {
        return closest.url;
    }

    return closest.url.replace(/https?:\/\/(web\.archive\.org\/web\/\d{14})/, `https://$1${ARCHIVE_URL_MODE[mode]}`);
};
