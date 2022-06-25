// get newest chapter
function newestChapter(domain) {
    let targetNode = null;
    if (domain === 'manga4life') {
        targetNode = document.querySelector("a.list-group-item.ChapterLink.ng-scope");
        if (targetNode === null) {
            return false;
        }
        return targetNode.innerText
    } else if (domain === 'mangakakalot') {
        try {
            targetNode = document.querySelector("#list-chapter-en").querySelector('.item').querySelector('.item-name');
        } catch (error) {
            return false
        }
        if (targetNode === null) {
            return false;
        }
        return targetNode.innerText
    } else if (domain === 'webtoons') {
        targetNode = document.querySelector("span.subj")
        if (targetNode === null) {
            return false;
        } else {
            let start = 0;
            let chapter = '';
            let chapterEnd = false;
            if (targetNode.innerText.indexOf('Ep') > -1) {
                start = targetNode.innerText.indexOf('Ep') + 1;
            };
            while (start < targetNode.innerText.length && !chapterEnd) {
                if (parseInt(targetNode.innerText.slice(start + 1, start + 2)) || targetNode.innerText.slice(start + 1, start + 2) === '0' || (chapter.length > 0 && targetNode.innerText.slice(start + 1, start + 2) === '.')) {
                    chapter = chapter + targetNode.innerText.slice(start + 1, start + 2);
                } else if (chapter.length > 0) {
                    chapterEnd = true
                }
                start++
            };
            return chapter
        }
    }
}

// Stalls function to occur when DOM fully loaded
function sleep(time) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, time)
    })
}

// get url function
function getUrl() {
    let url = window.location.href;
    if (url === null) {
        return false;
    } return url;
};

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

// main function 
async function doWork() {
    let reg = /[+-]?\d+(\.\d+)?/g;
    let latestChapter = '';
    let chapterUpdate = false; // find latest chapter; false otherwise
    let webUrl = false;
    let count = 0;
    const validDomains = ['manga4life', 'mangakakalot', 'webtoons'];
    while (!chapterUpdate && count <= 5 && !webUrl) {
        await sleep(500);
        webUrl = getUrl();
        chapterUpdate = newestChapter(getDom(webUrl));
        count++;
    };
    // const fetchResponse = await fetch(webUrl, {
    //     method: 'GET'
    // });
    // const textData = await fetchResponse.text();
    // console.log(textData)
    chrome.runtime.onMessage.addListener(
        (request, sender, sendResponse) => {
            if (request.search === "url" && request.item === "chapter") {
                if (validDomains.includes(getDom(webUrl)) && typeof chapterUpdate === "string") {
                    latestChapter = chapterUpdate.match(reg).map((v) => { return parseFloat(v) }); // newest chapter
                    console.log(latestChapter);
                    sendResponse({ site: webUrl, newChapter: latestChapter[0] });
                } else {
                    sendResponse({ site: webUrl, newChapter: false });
                }
            }
        }
    );
    return;
};
doWork();
