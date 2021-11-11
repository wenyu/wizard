let levelCache = {};
let background;
let gridX;
let gridY;
let gridState = true;
let snapDistance = 20;

function promptKey() {
    localStorage.setItem('key', prompt('key'));
}

function apiCall(path, method, data) {
    const key = localStorage.getItem('key');
    const url = new URL(path, document.location.origin);
    url.search = new URLSearchParams({'key': key}).toString();
    const options = {};
    if (method !== undefined)
        options.method = method;
    if (data !== undefined)
        options.body = JSON.stringify(data);
    return fetch(url, options).then(res => {
        if (res.status === 403) {
            promptKey();
            return apiCall(path, method, data);
        }
        return res.json();
    });
}

function levelBlockToObj(levelBlock) {
    const level = {
        id: Number(levelBlock.getElementsByClassName('level_id')[0].textContent),
        name: levelBlock.getElementsByClassName('level_name')[0].value,
        grid_location: [null, null]
    };
    for (let solutionType of ['solutions', 'unlocks']) {
        const solutionsStr = levelBlock.getElementsByClassName(`level_${solutionType}`)[0].value;
        level[solutionType] = solutionsStr.split('\n').filter(e => e);
    }
    for (let discordIdType of ['discord_channel', 'discord_role', 'extra_discord_role']) {
        level[discordIdType] = levelBlock.getElementsByClassName(`level_${discordIdType}`)[0].value || null;
    }
    return level;
}

function createLevelBlock(level) {
    const block = document.createElement("div");
    block.className = 'block';
    block.id = 'start';
    background.appendChild(block);
    const draggable = new PlainDraggable(block);
	draggable.onDrag = function(position) {
	    const snappedX = Math.round((container.scrollLeft + position.left) / snapDistance) * snapDistance - container.scrollLeft;
	    const snappedY = Math.round((container.scrollTop + position.top) / snapDistance) * snapDistance - container.scrollTop;
	    position.snapped = snappedX != position.left || snappedY != position.top;
	    if (position.snapped) {
	        position.left = snappedX;
	        position.top = snappedY;
	    }
    };
	draggable.autoScroll = {target: container};
}

function loadConfig() {
    const optionsElem = document.getElementById('config');
    while (optionsElem.firstChild)
        optionsElem.removeChild(optionsElem.firstChild);
    apiCall('/api/config/').then(config => {
        for (const [key, value] of Object.entries(config)) {
            const p = document.createElement('p');
            p.textContent = `${key}: ${value}`;
            const editButton = document.createElement('button');
            editButton.textContent = 'edit';
            editButton.onclick = () =>
                apiCall('/api/config/', 'POST', {[key]: prompt('value')}).then(loadConfig);
            p.appendChild(editButton);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'delete';
            deleteButton.onclick = () => apiCall(`/api/config/${key}`, 'DELETE').then(loadConfig);
            p.appendChild(deleteButton);
            optionsElem.appendChild(p);
        }
    });
}

function loadLevels() {
    apiCall('/api/levels/').then(levels => {
        levelCache = levels;
        for (const [id, level] of Object.entries(levels)) {
            createLevelBlock(level);
        }
    });
}


document.addEventListener('DOMContentLoaded', e => {
    background = document.getElementById("background");
    container = document.getElementById("container");
    gridX = document.querySelector("div svg defs pattern").width.animVal.value;
    gridY = document.querySelector("div svg defs pattern").height.animVal.value;
    if (localStorage.getItem('key') === null) {
        promptKey();
    }
//    loadConfig();
    loadLevels();
//    document.getElementById('add_config_button').onclick = e => {
//        const configKey = prompt('key');
//        if (!configKey)
//            return;
//        const configValue = prompt('key');
//        if (!configValue)
//            return;
//        apiCall('/api/config/', 'POST', {[configKey]: configValue}).then(loadConfig);
//    };
    document.getElementById('add_level_button').onclick = () =>
        apiCall('/api/levels/', 'POST').then(createLevelBlock);
    document.getElementById('save_levels_button').onclick = () => {
        for (let levelBlock of document.querySelectorAll('.level_block.changed')) {
            const newLevel = levelBlockToObj(levelBlock);
            apiCall(`/api/levels/${newLevel.id}`, 'POST', newLevel).then(r => {
                if (r.message === 'ok') {
                    levelBlock.classList.toggle('changed', false);
                    levelCache[newLevel.id] = newLevel;
                } else {
                    levelBlock.classList.toggle('error', true);
                }
            });
            console.log(newLevel);
        }
    }
});

function toggleGrid() {
     if (gridState) {
        main.style.fill = "#1a1a21";
        gridState = false;
     } else {
        main.style.fill = "url(#bigGrid)";
        gridState = true;
     }
}