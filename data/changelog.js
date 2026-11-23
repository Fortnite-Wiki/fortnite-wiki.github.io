// Add a new entry at the top before each push. Use an ISO timestamp with a timezone.
// For example: 2026-11-22T07:55:27Z (UTC). Visitors will see their local time.
// Keep the newest update first. You can add as many changes as you need.
export default [
    {
        publishedAt: '2026-11-23T16:00:00Z',
        title: 'Direct localization hotfix updates',
        changes: [
            'Generators now load localization hotfixes directly from the public hotfix API.',
            'Removed the separate hotfix synchronization workflow.'
        ]
    },
    {
        publishedAt: '2026-11-23T03:31:06Z',
        title: 'Hotfixed names in data changes',
        changes: [
            'Cosmetic data changelog entries now show hotfixed cosmetic names when available.'
        ]
    },
    {
        publishedAt: '2026-11-23T03:27:32Z',
        title: 'Cleaner added item entries',
        changes: [
            'Newly added cosmetics now show only their name and ID in the cosmetic data changelog.'
        ]
    },
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
            'Generators now read localization hotfixes directly from the public collector feed.',
            'The cosmetic data changelog includes the latest changes detected by the collector.'
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
