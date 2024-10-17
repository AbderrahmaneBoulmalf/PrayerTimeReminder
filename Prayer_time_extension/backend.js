//URL for fetching prayer times

const PRAYER_API_URL = "https://api.aladhan.com/v1/timingsByCity";

let city = 'Mecca'; //default city
let country = 'Saudi Arabia'; //default country
let reminder = 10;
let prayerTimes = {};

function fetchUserSettings(){
    chrome.storage.local.get(['city','country','reminder'],(result)=>{
    city = result.city || 'Mecca';
    country = result.country || 'Saudi Arabia';
    reminder = result.reminder || 10;

    fetchPrayerTimes();
    })
}

async function fetchPrayerTimes(){
    try{
        const response = await fetch(`${PRAYER_API_URL}?city=${city}&country=${country}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        console.log("API Response:", data);

        if (data && data.data && data.data.timings) {
        prayerTimes = data.data.timings;
        scheduleNotifications();
        }else{
            throw new Error('Invalid API response structure.');
        }
    }catch(error){
        
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/error.png',
            title: 'Error',
            message: 'Failed to fetch prayer times. Please check your settings or connection.',
            priority: 2
        });
    }
}

function scheduleNotifications(){
    chrome.alarms.clearAll(() => {  // Clear any existing alarms before setting new ones
        Object.keys(prayerTimes).forEach(prayer => {
            const prayerTime = new Date(`${new Date().toDateString()} ${prayerTimes[prayer]}`);

            // Schedule a notification for the exact prayer time
            chrome.alarms.create(`${prayer}_exact`, { when: prayerTime.getTime() });

            // Schedule a notification for the reminder time before the prayer
            const reminderTimeInMs = reminder * 60 * 1000;
            const beforePrayerTime = new Date(prayerTime.getTime() - reminderTimeInMs);
            chrome.alarms.create(`${prayer}_before`, { when: beforePrayerTime.getTime() });
        });
    });
}

chrome.alarms.onAlarm.addListener((alarm) => {
    const prayerName = alarm.name.split('_')[0];
    
    if (alarm.name.endsWith('_before')) {
        // Notification for the reminder (e.g., 10 minutes before)
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/crescent.png',
            title: 'Prayer Reminder',
            message: `The ${prayerName} prayer is in ${reminder} minutes.`
        });
    } else if (alarm.name.endsWith('_exact')) {
        // Notification for the exact prayer time
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/call_to_prayer.png',
            title: 'Prayer Time',
            message: `It’s time for ${prayerName} prayer!`
        });
    }
});

function scheduleDailyPrayerTimeUpdate() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0); // Next midnight
    const timeUntilMidnight = midnight.getTime() - now.getTime();

    // Set an alarm to trigger the fetchPrayerTimes function daily at midnight
    chrome.alarms.create('dailyPrayerUpdate', { when: Date.now() + timeUntilMidnight, periodInMinutes: 1440 }); // 1440 minutes = 24 hours
}

// Triggered by the daily prayer time update alarm
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'dailyPrayerUpdate') {
        fetchPrayerTimes();  // Fetch new prayer times every day at midnight
    }
});

chrome.runtime.onStartup.addListener(() => {
    fetchUserSettings();
    scheduleDailyPrayerTimeUpdate();  // Schedule daily updates on startup
});

chrome.runtime.onInstalled.addListener(() => {
    fetchUserSettings();
    scheduleDailyPrayerTimeUpdate();  // Schedule daily updates on installation
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateSettings") {
        city = message.city;
        country = message.country;
        reminder = message.reminder;

        // Save updated settings to Chrome storage
        chrome.storage.local.set({ city: city, country: country, reminder: reminder }, () => {
            // Fetch updated prayer times and reschedule notifications
            fetchPrayerTimes();
            sendResponse({ status: "Settings updated and notifications rescheduled" });
        });
    }
});