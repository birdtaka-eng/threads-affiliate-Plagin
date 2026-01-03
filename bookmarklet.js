/**
 * Threads Shokunin Session Sync Bookmarklet
 * 
 * Instructions:
 * 1. Replace YOUR_DEPLOY_URL with your actual Cloud Run URL.
 * 2. Create a bookmark with the content: javascript:(function(){...})()
 */

(function () {
    const API_URL = 'https://YOUR_DEPLOY_URL_HERE/api/auth/save-state';

    // Parse document.cookie
    const cookies = document.cookie.split(';').map(c => {
        const [name, ...v] = c.trim().split('=');
        return {
            name: name,
            value: v.join('='),
            domain: '.threads.net', // Assumption for bookmarklet
            path: '/',
            secure: true
        };
    });

    if (cookies.length === 0) {
        alert('No cookies found! Please log in to Threads first.');
        return;
    }

    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cookies: cookies })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Session synced successfully! You can now use the auto-poster.');
            } else {
                alert('Sync failed: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(err => {
            alert('Error: ' + err.message + '\nMake sure the API URL is correct and allows CORS.');
        });
})();
