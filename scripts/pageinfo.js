import tools from '../data/tools.js';

const thisToolName = window.location.pathname.replace(/\/tools\/|\/|index\.html|^\./g, '');

/* Add Version Number */
const versionElm = document.querySelector('header .version');
if (versionElm) {
    for (const tool of tools) {
        if (tool.version && tool.id === thisToolName) {
            versionElm.innerText = tool.version;
            break;
        }
    }
}