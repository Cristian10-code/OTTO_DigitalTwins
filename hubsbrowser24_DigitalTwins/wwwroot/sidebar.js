import { SelectionState } from './fileName.js';

async function getJSON(url) {
    const resp = await fetch(url);
    if (!resp.ok) {
        alert('Could not load tree data. See console for more details.');
        console.error(await resp.text());
        return [];
    }
    return resp.json();
}

function createTreeNode(id, text, icon, children = false) {
    return { id, text, children, itree: { icon } };
}

async function getHubs() {
    const hubs = await getJSON('/api/hubs');
    return hubs.map(hub => createTreeNode(`hub|${hub.id}`, hub.name, 'icon-hub', true));
}

async function getProjects(hubId) {
    const projects = await getJSON(`/api/hubs/${hubId}/projects`);
    return projects.map(project => createTreeNode(`project|${hubId}|${project.id}`, project.name, 'icon-project', true));
}

window.itemNames = window.itemNames || {};

async function getContents(hubId, projectId, folderId = null) {
    const contents = await getJSON(`/api/hubs/${hubId}/projects/${projectId}/contents` + (folderId ? `?folder_id=${folderId}` : ''));
    return contents.map(item => {
        if (item.folder) {
            return createTreeNode(`folder|${hubId}|${projectId}|${item.id}`, item.name, 'icon-my-folder', true);
        } else {
            window.itemNames[item.id] = item.name;
            return createTreeNode(`item|${hubId}|${projectId}|${item.id}`, item.name, 'icon-item', true);
        }
    });
}

async function getVersions(hubId, projectId, itemId) {
    const versions = await getJSON(`/api/hubs/${hubId}/projects/${projectId}/contents/${itemId}/versions`);
    return versions.map(version => createTreeNode(
        `version|${hubId}|${projectId}|${itemId}|${version.id}`,
        version.name,
        'icon-version'
    ));
}

export function initTree(selector, onSelectionChanged) {
    const selectionState = new SelectionState();
    const tree = new InspireTree({
        data: function (node) {
            if (!node || !node.id) {
                return getHubs();
            } else {
                const tokens = node.id.split('|');
                switch (tokens[0]) {
                    case 'hub': return getProjects(tokens[1]);
                    case 'project': return getContents(tokens[1], tokens[2]);
                    case 'folder': return getContents(tokens[1], tokens[2], tokens[3]);
                    case 'item': return getVersions(tokens[1], tokens[2], tokens[3]);
                    default: return [];
                }
            }
        }
    });
    tree.on('node.click', function (event, node) {
        event.preventTreeDefault();
        const tokens = node.id.split('|');
        if (tokens[0] === 'item') {
            selectionState.setLastSelectedItemId(tokens[3]);
            document.getElementById('selected-item-display').innerText = `Ítem seleccionado: ${tokens[3]}`;
        }

        if (tokens[0] === 'version') {
            const itemId = tokens[3];
            const itemName = window.itemNames[itemId] || 'Desconocido';
            document.getElementById('selected-item-display').innerText = `Model Selected: ${itemName}`;
            onSelectionChanged(tokens[4]);
        }
    });

    return new InspireTreeDOM(tree, { target: selector });
}