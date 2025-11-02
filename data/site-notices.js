/*
    * Configuration: add/remove notices here.
    * Each notice supports:
    * - id: string (unique)
    * - type: 'info' | 'danger' | other (used for .notice-type class)
    * - collapsible: boolean
    * - dismissible: boolean
    * - summaryText: string (shown in header when collapsed)
    * - bodyHtml: string (HTML for the notice body)
    * - targets: array of { selector: string, paths?: string[] } describing where to inject the notice.
    *   - selector: CSS selector to find the insertion point (notice container will be inserted after this element)
    *   - paths: optional array of pathname prefixes (e.g. '/tools/bundle-page-generator/') where the notice should appear.
    *            If omitted, the notice will appear on any page where the selector exists.
    */

export default [
    {
        id: 'update-info',
        type: 'info',
        collapsible: true,
        dismissible: false,
        summaryText: 'Latest update to this site: <span class="latest-update-summary" style="font-weight: bold;">Unknown</span>',
        bodyHtml: '<p><strong>Note:</strong> Cosmetics added in new updates or decrypted using new AES keys will not appear in generators unless a staff member manually updates this site\'s data.</p>\n<p><em>Latest update was: <span class="latest-update-full" style="font-weight: bold;">Unknown</span></em></p>',
        paths: ['/'],
        excludePaths: ['/tools/jam-track-generator/', '/tools/lore-character-generator/']
    },
    {
        id: '38.00-mappings',
        type: 'danger',
        collapsible: false,
        dismissible: true,
        bodyHtml: '<strong>Important:</strong> v38.00 cosmetics have not yet been added due to a lack of mappings.',
        paths: ['/'],
        excludePaths: ['/tools/jam-track-generator/', '/tools/lore-character-generator/']
    }
];