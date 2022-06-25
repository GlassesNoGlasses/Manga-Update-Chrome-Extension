// chrome.storage.sync.clear();

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        const alarmTime = new Date().setHours(32);
        const minutesToDays = 60 * 24;
        chrome.alarms.create(
            "DailyChecker", {
            when: 1, periodInMinutes: 1
        })
    } else if (details.reason === 'update') {
        // do stuff here on update
    }
})

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "DailyChecker") {
        chrome.action.setBadgeText({ text: 'daily' })
    }
})

chrome.tabs.onCreated.addListener(() => {
    chrome.action.getBadgeText({}, (text) => {
        if (text === '') {
            chrome.action.setBadgeText({ text: 'daily' })
        }
    })
});

async function innerUpdate(titlesDictionary, v, currentManga, manga) { // test
    let isupdate = false;
    let newChapter = -1;
    let currentUpdates = {};
    // obtain and process manga updates on url
    const webDom = getDom(v); // register different web doms
    const fetchResponse = await fetch(v, {
        method: 'GET'
    });
    const textData = await fetchResponse.text();
    newChapter = checkChapter(textData, webDom);
    // update main storage
    if (newChapter > currentManga.latestChapter) {
        isupdate = true
        currentManga.lastUpdated = createDate()
        currentManga.latestChapter = newChapter; // update to newest chapter
        chrome.storage.sync.set({ allTitles: titlesDictionary }, () => {
            console.warn('Value is set to ', titlesDictionary);
        });
        if (!Object.keys(currentUpdates).includes(manga)) {
            currentUpdates[manga] = [];
            currentUpdates[manga].unshift(v);
        } else if (!currentUpdates[manga].includes(v) && currentUpdates[manga].length < 5) {
            currentUpdates[manga].unshift(v);
        } else if (!currentUpdates[manga].includes(v) && currentUpdates[manga].length >= 5) {
            currentUpdates[manga].pop();
            currentUpdates[manga].unshift(v);
        }
        createNotification(manga, webDom, currentManga.lastQueried);
        if (currentUpdates !== {}) {
            if (!Object.keys(savedTitles).includes(manga)) {
                savedTitles[manga] = currentUpdates[manga]
            } else if (!savedTitles[manga].includes(currentUpdates[manga][0])) {
                savedTitles[manga].push(currentUpdates[manga][0])
            }
            chrome.storage.sync.set({ validUpdates: savedTitles }, () => {
                console.warn('Updated Mangas are ', savedTitles)
            })
        }
    };
    if (!isupdate) {
        chrome.storage.sync.set({ allTitles: titlesDictionary }, () => {
            console.warn('Value is set to ', titlesDictionary);
        });
    }
}

function createDate() {
    let today = new Date();
    let hour = String(today.getHours());
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    if (hour.length < 2) {
        hour = '0' + hour;
    }
    today = mm + '/' + dd + '/' + yyyy + '/' + hour;
    return today
}

function queryDate(alarmedManga) {
    alarmedManga.lastQueried = createDate();
    chrome.storage.sync.set({ allTitles: alarmedManga }, () => {
        console.warn('Value is set to ', alarmedManga);
    });
}

function createNotification(manga, dom, date) {
    const chapterHour = parseInt(date.slice(-2))
    chrome.notifications.create(
        manga,
        {
            type: "basic",
            title: "New " + manga + " Chapter released!",
            iconUrl: "images/notification_1.jpeg",
            message: "New Chapter found at " + String(dom) + ", " + String(date.slice(0, -3)) + ' at hour ' + chapterHour
        }
    );
}


function sleep(time) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, time)
    })
}

function getDom(url) {
    let domain = '';
    let startIndex = url.indexOf("//") + 2;
    if (url.includes('www.')) {
        startIndex = url.indexOf('www.') + 4;
    }
    while (url[startIndex] !== '.') {
        domain = domain + url[startIndex];
        startIndex++;
    } return domain;
};

function checkChapter(rawData, website) {
    let chapter = false;
    let rawChapter = '';
    if (website === 'manga4life') {
        const chapterIndex = rawData.indexOf('{"Chapter":"');
        rawChapter = rawChapter + rawData.slice(chapterIndex + 12, chapterIndex + 18);
        chapter = parseFloat(rawChapter.slice(1, -1) + '.' + rawChapter.slice(-1));
    } else if (website === 'mangakakalot') {
        const titleIndex = rawData.indexOf('<title>Read ') + '<title>Read '.length;
        const titleIndexEnd = rawData.indexOf(' on Mangakakalot');
        const title = rawData.slice(titleIndex, titleIndexEnd);
        let chapterIndex = rawData.indexOf('Chap ', rawData.indexOf('title="' + title));
        while (rawData.slice(chapterIndex + 5, chapterIndex + 6) !== ' ') {
            rawChapter = rawChapter + rawData.slice(chapterIndex + 5, chapterIndex + 6)
            chapterIndex = chapterIndex + 1
        } chapter = parseFloat(rawChapter);
    } else if (website === 'webtoons') {
        const chapterIndexStart = rawData.indexOf('data-episode-no="') + 17;
        const chapterIndexEnd = rawData.indexOf('"', chapterIndexStart);
        chapter = parseFloat(rawData.slice(chapterIndexStart, chapterIndexEnd));
    }
    return chapter;
}

let allManga = {};
let savedTitles = {};
let updatedCollection = {};

chrome.storage.sync.get("validUpdates", (updates) => {
    if (updates !== undefined) {
        savedTitles = { ...updates.validUpdates };
        console.log(savedTitles)
    };
});

function update(titlesDictionary, mangaAlarm) {
    const manga = mangaAlarm.name;
    const currentManga = titlesDictionary[manga];
    currentManga.lastQueried = createDate();
    currentManga.urls.forEach((v) => {
        // manually add all valid urls and full send it
        innerUpdate(titlesDictionary, v, currentManga, manga);
    });
    return titlesDictionary;
}

// chrome.alarms.getAll((alarms) => {
//     console.log(alarms)
//     alarms.forEach((alarm) => {
//         let day = new Date(alarm.scheduledTime).getDay()
//         let hours = new Date(alarm.scheduledTime).getHours()
//         let alarmCheck = [alarm.name, day, hours]
//         console.log(alarmCheck)
//     })
// })

chrome.alarms.onAlarm.addListener((alarm) => {
    console.warn('got an alarm, ', alarm);
    if (!(alarm.name === "DailyChecker")) {
        chrome.storage.sync.get("allTitles", async (titles) => {
            if (titles !== undefined) {
                if (Object.keys(updatedCollection).length > 0) {
                    allManga = { ...updatedCollection }
                } else {
                    allManga = { ...titles.allTitles };
                }
                if (Object.keys(allManga).includes(alarm.name)) {
                    updatedCollection = await update(allManga, alarm)
                } else {
                    chrome.alarms.clear(alarm.name)
                }
            }
        })
    }
});
