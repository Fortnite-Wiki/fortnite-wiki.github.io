import tools from '../data/tools.js';

const allElements = tools.map((tool, i) => {
    if (tool.isSiteTool) tool.link = `/tools/${tool.id}/index.html`;

    // give each <img> a unique id
    const imgId = `tool-img-${i}`;

    let initialImageSrc;
    if (Array.isArray(tool.thumbnails) && tool.thumbnails.length > 0) {
        const randomIdx = Math.floor(Math.random() * tool.thumbnails.length);
        initialImageSrc = tool.thumbnails[randomIdx];
    } else {
        initialImageSrc = tool.id || tool.thumbnail;
    }

    return [
        `<li class="${tool.isSiteTool ? 'sitetool' : ''}">`,
        `<a href="${tool.link}"${!tool.isSiteTool ? ' target=_blank' : ''}>`,
        `<img id="${imgId}" src="/files/images/tool-icons/${initialImageSrc}.png" alt="tool logo">`,
        '</a>',
        '<hr>',
        `<h4>${tool.name}</h4>`,
        `<span class="version">${tool.version ? tool.version : '&nbsp;'}</span>`,
        `<p>${tool.description}</p>`,
        '<div class="links">',
        `<a class="link" href="${tool.link}"${!tool.isSiteTool ? ' target=_blank' : ''}>Open</a>`,
        '</div>',
        '</li>',
    ].join('');
});

document.querySelector('section.tools > ul').innerHTML = allElements.join('');

// after DOM is built, set up cycling
tools.forEach((tool, i) => {
    if (Array.isArray(tool.thumbnails) && tool.thumbnails.length > 1) {
        const img = document.getElementById(`tool-img-${i}`);
        let currentImageIndex = -1;
        
        const currentSrc = img.src.split('/').pop().replace('.png', '');
        currentImageIndex = tool.thumbnails.indexOf(currentSrc);
        
        setInterval(() => {
            let newIdx;
            do {
                newIdx = Math.floor(Math.random() * tool.thumbnails.length);
            } while (newIdx === currentImageIndex && tool.thumbnails.length > 1);
            
            currentImageIndex = newIdx;
            img.src = `/files/images/tool-icons/${tool.thumbnails[newIdx]}.png`;
        }, 3000); // 3s interval
    }
});
