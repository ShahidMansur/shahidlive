const fs = require('fs');

// আপনার সোর্স লিংকগুলো
const sources = [
    "https://raw.githubusercontent.com/Shadmanislam/bdiptv/master/BD%20IPTV.m3u",
    "https://github.com/abusaeeidx/Mrgify-BDIX-IPTV/raw/main/playlist.m3u",
    "https://iptv-org.github.io/iptv/countries/bd.m3u",
    "https://raw.githubusercontent.com/FunctionError/PiratesTv/main/combined_playlist.m3u"
];

// ম্যানুয়াল চ্যানেল (যেগুলো সবসময় অ্যাকটিভ রাখতে চান)
const manualChannels = [
    { name: "T Sports HD", url: "https://live-cdn.tsports.com/live-01/index.m3u8", type: "bd,sports" },
    { name: "GTV (Gazi TV)", url: "https://rhridoy136.shortcm.li/gtv.m3u8", type: "bd,sports" },
    { name: "BTV World", url: "https://rhridoy136.shortcm.li/btvworld.m3u8", type: "bd" }
];

async function checkLink(url) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // ৫ সেকেন্ডের মধ্যে রেসপন্স না পেলে ডেড
        const response = await fetch(url, { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);
        return response.ok; 
    } catch (error) {
        return false; // লিংক কাজ না করলে false রিটার্ন করবে
    }
}

async function startUpdate() {
    console.log("Fetching M3U sources...");
    let allChannels = [...manualChannels];
    let uniqueUrls = new Set(manualChannels.map(c => c.url));

    for (const source of sources) {
        try {
            const res = await fetch(source);
            const text = await res.text();
            const lines = text.split('\n');
            let tempName = '', tempType = '';

            for (let line of lines) {
                line = line.trim();
                if (line.startsWith('#EXTINF:')) {
                    tempName = line.split(',').pop().replace(/\[.*?\]|\(.*?\)|[-_]/g, ' ').replace(/1080p|720p|HD|SD|FHD/gi, '').trim();
                    let lowLine = line.toLowerCase();
                    
                    let isBD = lowLine.includes('bangladesh') || lowLine.includes('bd') || lowLine.includes('bangla');
                    let isSport = lowLine.includes('sport') || lowLine.includes('espn') || lowLine.includes('fifa') || lowLine.includes('cricket');

                    if (isBD && isSport) tempType = 'bd,sports';
                    else if (isBD) tempType = 'bd';
                    else if (isSport) tempType = 'sports';
                    else tempType = 'skip';

                } else if (line.startsWith('http') && tempType !== 'skip' && tempName) {
                    if (!uniqueUrls.has(line)) {
                        allChannels.push({ name: tempName, url: line, type: tempType });
                        uniqueUrls.add(line);
                    }
                    tempName = ''; tempType = '';
                }
            }
        } catch (e) {
            console.log(`Failed to fetch source: ${source}`);
        }
    }

    console.log(`Total found: ${allChannels.length} channels. Checking active status (This may take a few minutes)...`);
    
    let activeChannels = [];
    
    // একসাথে চেক না করে একটি একটি করে চেক করবে যাতে সার্ভারে ব্লক না খায়
    for (let ch of allChannels) {
        let isWorking = await checkLink(ch.url);
        if (isWorking) {
            activeChannels.push(ch);
            console.log(`✅ ACTIVE: ${ch.name}`);
        } else {
            console.log(`❌ DEAD: ${ch.name}`);
        }
    }

    // অ্যাকটিভ চ্যানেলগুলো JSON ফাইলে সেভ করা
    fs.writeFileSync('channels.json', JSON.stringify(activeChannels, null, 2));
    console.log(`Update Complete! Total Active Channels: ${activeChannels.length}`);
}

startUpdate();
