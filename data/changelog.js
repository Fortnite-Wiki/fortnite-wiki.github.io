// Add a new entry at the top before each push. Use an ISO timestamp with a timezone.
// For example: 2026-11-22T07:55:27Z (UTC). Visitors will see their local time.
// Keep the newest update first. You can add as many changes as you need.
export default [
    {
        publishedAt: '2026-11-23T03:03:04Z',
        title: 'Hotfixed names across generators',
        changes: [
            'Search results now show hotfixed cosmetic and bundle names across the generators and Cosmo.',
            'The translator now includes available hotfixed names, descriptions, and translations.',
            'Set pages use hotfixed set names and can find bundles under either the new or original set category.',
            'Bundle pages and Cosmo filenames now use hotfixed cosmetic names where available.',
            'The site updates list scrolls and always shows the newest update first.'
        ]
    },
    {
        publishedAt: '2026-11-23T02:27:24Z',
        title: 'Cosmetic localization hotfixes',
        changes: [
            'Cosmetic pages now use available localization hotfixes for names, descriptions, and translations.',
            'Cosmetics with hotfixed names can be found by their updated name in the page generator; generated page text and image filenames use that name too.',
            'Added automatic syncing of localization hotfixes from the collector every five minutes.'
        ]
    },
    {
        publishedAt: '2026-11-22T08:11:23Z',
        title: 'Local changelog times',
        changes: [
            'Changelog dates and times now appear in your local timezone.',
            'Updated v43.00 cosmetics.'
        ]
    },
    {
        publishedAt: '2026-11-22T07:55:27Z',
        title: 'Site changelog',
        changes: [
            'Added a changelog page for site updates and cosmetic data changes.',
            'Added a View changelog button to the update notice.'
        ]
    }
];
