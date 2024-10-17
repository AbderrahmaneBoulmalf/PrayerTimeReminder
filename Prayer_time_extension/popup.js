
// a function to save the user's settings

function saveSettings(event)
{
    event.preventDefault();

    const city = document.getElementById("City");
    const country = document.getElementById("Country");
    const reminder = document.querySelector('input[name="reminder_time"]:checked').value;

    chrome.storage.local.set({
        city : city,
        country : country,
        reminder : reminder

    }, () =>{
        alert('Settings saved successfully!');
    })
}

function restoreSettings() {

    chrome.storage.local.get(['city', 'country', 'reminderTime'], (result) => {
        if (result.city) {
            document.getElementById('City').value = result.city;
        }
        if (result.country) {
            document.getElementById('Country').value = result.country;
        }
        if (result.reminder) {

            const reminderRadio = document.getElementById(result.reminder);
            if (reminderRadio) {
                reminderRadio.checked = true;
            }
        }
    });
}

document.querySelector('form').addEventListener('submit',saveSettings);

document.addEventListener('DOMContentLoaded', restoreSettings);