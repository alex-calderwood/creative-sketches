export function getTagVersion(project, tag) {
    if (project.tags && project.tags[tag] && project.tags[tag].version) {
        return project.tags[tag].version;
    }
    if (project.version) {
        return project.version;
    }
    return null;
}

export function getProjectTags(project) {
    const tags = [];
    if (project.tags && typeof project.tags === 'object') {
        tags.push(...Object.keys(project.tags));
    }
    if (project.series && !project.tags) {
        const seriesTags = Array.isArray(project.series) ? project.series : [project.series];
        tags.push(...seriesTags);
    }
    return tags;
}

export function projectHasTag(project, tag) {
    if (project.tags && project.tags[tag]) {
        return true;
    }
    if (project.series) {
        const tags = Array.isArray(project.series) ? project.series : [project.series];
        return tags.includes(tag);
    }
    return false;
}

export function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    } catch (e) {
        return dateString;
    }
}

export function getDominantColor(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.height = 50;
    ctx.drawImage(img, 0, 0, 50, 50);

    const data = ctx.getImageData(0, 0, 50, 50).data;
    const colorMap = {};

    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
    }

    let maxCount = 0;
    let dominantColor = '255,255,255';

    for (const [color, count] of Object.entries(colorMap)) {
        if (count > maxCount) {
            maxCount = count;
            dominantColor = color;
        }
    }

    const [r, g, b] = dominantColor.split(',').map(Number);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const textColor = luminance > 0.5 ? '#18191a' : '#ffffff';

    return { color: `rgb(${dominantColor})`, textColor };
}

export function createProjectCard(project) {
    const card = document.createElement('a');
    card.href = window.BASE_PATH + `/${project.url}/`;
    card.className = 'page';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'project-content';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'project-name';
    nameDiv.textContent = project.name;

    if (project.date) {
        const dateSpan = document.createElement('span');
        dateSpan.className = 'project-date';
        dateSpan.textContent = formatDate(project.date);
        nameDiv.appendChild(dateSpan);
    }

    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'project-description';
    descriptionDiv.innerHTML = project.description || '';

    contentDiv.appendChild(nameDiv);
    contentDiv.appendChild(descriptionDiv);

    const metadataDiv = document.createElement('div');
    metadataDiv.className = 'project-metadata';

    const metadataLines = [];

    const projectTags = getProjectTags(project);
    if (projectTags.length > 0) {
        const tagStrings = projectTags.map(tag => {
            const version = getTagVersion(project, tag);
            let s = version ? `${tag} v${version}` : `${tag}`;
            return `<span class="page-tag">${s}</span>`;
        });
        metadataLines.push(tagStrings.join(' '));
    }

    const excludeFields = ['name', 'notes', 'description', 'version', 'series', 'url', 'image', 'dir', 'hide', 'major', 'tags', 'date', 'score'];
    Object.entries(project).forEach(([key, value]) => {
        if (!excludeFields.includes(key) && value !== null && value !== undefined && value !== '') {
            metadataLines.push(`${key}: ${value}`);
        }
    });

    if (metadataLines.length > 0) {
        metadataDiv.innerHTML = metadataLines.map(line => `<div>${line}</div>`).join('');
        contentDiv.appendChild(metadataDiv);
    }

    card.appendChild(contentDiv);

    if (project.image) {
        const image = document.createElement('img');
        image.className = 'project-image';
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const { color, textColor } = getDominantColor(image);
                card.style.setProperty('--bg-color', color);
                card.style.setProperty('--text-color', textColor);
            } catch (e) {
                console.warn('Could not extract color:', e);
            }
        };
        image.src = project.image;
        card.appendChild(image);
    }
    return card;
}
