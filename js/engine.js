// engine.js - LotusScript Class Map Interactive Engine
// Chunk 1: Core setup and custom shape

joint.shapes.custom = {};

joint.shapes.custom.LSClass = joint.dia.Element.extend({
    markup: `
        <g class="rotatable">
            <g class="scalable">
                <rect class="ls-body"/>
            </g>
            <rect class="ls-header"/>
            <text class="ls-title"/>
            <foreignObject class="ls-fo">
                <div xmlns="http://www.w3.org/1999/xhtml" class="ls-content"></div>
            </foreignObject>
        </g>
    `,
    defaults: joint.util.deepSupplement({
        type: "custom.LSClass",
        size: { width: 260, height: 200 },
        attrs: {
            ".ls-header": { fill: "#ffcc00", stroke: "#333", height: 28, width: 260 },
            ".ls-title": {
                ref: ".ls-header",          // ✅ anchor title to header rectangle
                "ref-x": 0.5,
                "ref-y": 0.5,
                "x-alignment": "middle",
                "y-alignment": "middle",
                "font-size": 13,
                "font-weight": "bold"
            },
            ".ls-body": { fill: "#fff", stroke: "#333", width: 260, height: 200 },

            ".ls-fo": { x: 5, y: 32, width: 250, height: 165 }
        }
    }, joint.dia.Element.prototype.defaults)
});


// ================================================================
// Chunk 2 — buildClassHTML() and metadata rendering utilities
// ================================================================

function buildClassHTML(node) {
    // Escape a value for safe use in a double-quoted HTML attribute.
    // Prevents description text containing quotes or angle brackets from
    // breaking out of the attribute and appearing as raw HTML in the node body.
    function attrEsc(s) {
        return (s || '').replace(/&/g, '&amp;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
    }

    function renderList(list, cssClass) {
        return list.map(item => {
            let o = typeof item === "string" ? { name: item } : item;

            const comBadge = o.comOnly
                ? `<span class="com-badge" title="COM/OLE only">COM</span>`
                : "";
            const noComBadge = o.notSupportedByCOM
                ? `<span class="no-com-badge" title="Not supported by COM">No COM</span>`
                : "";

            const attributes = `
                data-name="${attrEsc(o.name)}"
                data-description="${attrEsc(o.description)}"
                data-type="${attrEsc(o.type)}"
                data-returns="${attrEsc(JSON.stringify(o.returns || {}))}"
                data-params="${attrEsc(JSON.stringify(o.params || []))}"
                data-syntax="${attrEsc(o.syntax)}"
                data-example="${attrEsc(o.example)}"
                data-docurl="${attrEsc(o.docUrl)}"
                data-comonly="${o.comOnly ? 'true' : 'false'}"
                data-notsupportedbycom="${o.notSupportedByCOM ? 'true' : 'false'}"
                class="${cssClass} clickable"
            `;

            return `<div ${attributes}>${o.name}${comBadge}${noComBadge}</div>`;
        }).join("");
    }

    let props = node.props || [];
    let methods = node.methods || [];
    let events = node.events || [];

    let propsCollapsed = props.length > 10 ? "collapsed" : "";
    let methodsCollapsed = methods.length > 10 ? "collapsed" : "";
    let eventsCollapsed = events.length > 10 ? "collapsed" : "";

    return `
        <style>
            .section-title {
                font-weight: bold;
                font-size: 12px;
                margin-top: 4px;
                background: #fafafa;
                padding: 3px;
                border-bottom: 1px solid #ddd;
                cursor: pointer;
            }
            .prop, .method, .event {
                font-size: 11px;
                padding: 2px;
                border-bottom: 1px solid #eee;
                word-break: break-word;
            }
            .com-badge {
                display: inline-block;
                margin-left: 5px;
                padding: 0 3px;
                font-size: 9px;
                font-weight: bold;
                color: #fff;
                background: #888;
                border-radius: 2px;
                vertical-align: middle;
                line-height: 14px;
            }
            .no-com-badge {
                display: inline-block;
                margin-left: 5px;
                padding: 0 3px;
                font-size: 9px;
                font-weight: bold;
                color: #fff;
                background: #c0392b;
                border-radius: 2px;
                vertical-align: middle;
                line-height: 14px;
            }
            .clickable:hover {
                background: #ffe680;
            }
        </style>

        <div class="scrollable">

            ${props.length > 0 ? `
            <div class="section-title"
                 onclick="this.nextElementSibling.classList.toggle('collapsed')">
                Properties (${props.length})
            </div>
            <div class="${propsCollapsed}">
                ${renderList(props, 'prop')}
            </div>` : ''}

            ${methods.length > 0 ? `
            <div class="section-title"
                 onclick="this.nextElementSibling.classList.toggle('collapsed')">
                Methods (${methods.length})
            </div>
            <div class="${methodsCollapsed}">
                ${renderList(methods, 'method')}
            </div>` : ''}

            ${events.length > 0 ? `
            <div class="section-title"
                 onclick="this.nextElementSibling.classList.toggle('collapsed')">
                Events (${events.length})
            </div>
            <div class="${eventsCollapsed}">
                ${renderList(events, 'event')}
            </div>` : ''}

        </div>
    `;
}



// ================================================================
// Chunk 3 — Graph + Paper initialization, rendering nodes/links, layout, sidebar
// ================================================================

const graph = new joint.dia.Graph();
window.graph = graph;  // exposed for easter egg
const paper = new joint.dia.Paper({
    el: document.getElementById("paper-container"),
    model: graph,
    width: "100%",
    height: "100%",
    gridSize: 10,
    drawGrid: true,
    background: { color: "#f8f9fa" },
    cellViewNamespace: joint.shapes,
    defaultRouter: { name: "manhattan" },
    defaultConnector: { name: "rounded" },
    interactive: true
});
window.paper = paper;  // exposed for easter egg

let cellsById = {};

// Render all classes using JSON-driven positions
function renderClasses() {
    graph.clear();
    cellsById = {};

    // Add all nodes first — links are added after so they render beneath nodes
    LS_CLASSES.nodes.forEach(node => {
        const hasPos = typeof node.x === "number" && typeof node.y === "number";

        const classShape = new joint.shapes.custom.LSClass({
            id: node.id,
            position: {
                x: hasPos ? node.x : 100,
                y: hasPos ? node.y : 100
            },
            attrs: {
                '.ls-title': { text: node.name, fill: node.isUI ? "#ffffff" : "#333333" },
                '.ls-header': { fill: node.isUI ? "#00467f" : "#ffcc00" },

                '.ls-content': { html: buildClassHTML(node) }
            }
        });

        if (hasPos) classShape.set("prepositioned", true);

        graph.addCell(classShape);
        cellsById[node.id] = classShape;
    });

    // Add links after all nodes so they sit beneath nodes in the z-order
    const linkCells = [];
    LS_CLASSES.links.forEach(lnk => {
        const src = cellsById[lnk.source];
        const tgt = cellsById[lnk.target];
        if (!src || !tgt) return;

        const link = new joint.shapes.standard.Link();
        link.source(src);
        link.target(tgt);

        if (lnk.label) {
            let labelText = Array.isArray(lnk.label)
                ? lnk.label.join(", ")
                : lnk.label;
            if (labelText.length > 45) labelText = labelText.substring(0, 45) + "...";

            // Labels are hidden by default — revealed on hover (above zoom threshold)
            // or automatically when zoom crosses LABEL_ZOOM_THRESHOLD.
            link.appendLabel({
                attrs: {
                    text: { text: labelText, fontSize: 9, display: "none" },
                    rect: { fill: "#f8f9fa", stroke: "#ccc", opacity: 0.8, display: "none" }
                }
            });
        }

        link.attr({ line: { stroke: "#aaa", strokeWidth: 1 } });
        linkCells.push(link);
    });

    // Batch-add all links, then send each to the back so nodes always sit on top
    graph.addCells(linkCells);
    linkCells.forEach(link => link.toBack());

    layoutGraph();
    populateSidebar();

}

// Dagre layout — only auto-place nodes without explicit JSON positions
function layoutGraph() {
    joint.layout.DirectedGraph.layout(graph, {
        dagre: dagre,
        graphlib: graphlib,
        rankDir: "LR",
        nodeSep: 50,
        rankSep: 120,
        setPosition: (cell, pos) => {
            if (!cell.get("prepositioned")) {
                cell.position(pos.x, pos.y);
            }
        }
    });

    paper.scaleContentToFit({ padding: 40 });
}

// Populate sidebar — respects active filter, search term, and search scope
function populateSidebar() {
    const list   = document.getElementById("class-list");
    const search = document.getElementById("class-search").value.toLowerCase().trim();
    list.innerHTML = "";

    if (search && (activeSearchScope === "members" || activeSearchScope === "all")) {
        populateMemberResults(list, search);
    } else {
        populateClassResults(list, search);
    }

    applyFilterToCanvas();
}

function populateClassResults(list, search) {
    LS_CLASSES.nodes
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id))
        .forEach(node => {
            if (activeFilterType === 'ui'      && !node.isUI)           return;
            if (activeFilterType === 'backend'  && node.isUI)            return;
            if (activeFilterType === 'events'   && !node.events?.length) return;
            if (activeFilterCat && node.category !== activeFilterCat)    return;
            if (search && !node.id.toLowerCase().includes(search))       return;

            const li = document.createElement("li");
            li.textContent = node.id;
            li.dataset.id  = node.id;
            li.dataset.isui = node.isUI ? "true" : "false";
            list.appendChild(li);
        });
}

function populateMemberResults(list, search) {
    // Collect all matching members across all classes
    // In "members" scope: match method/prop/event names only
    // In "all" scope: also match class names and descriptions
    const membersOnly = (activeSearchScope === "members");
    const results = [];   // [{node, kind, member}]

    LS_CLASSES.nodes.forEach(node => {
        // Filter still applies in member search
        if (activeFilterType === 'ui'      && !node.isUI)           return;
        if (activeFilterType === 'backend'  && node.isUI)            return;
        if (activeFilterType === 'events'   && !node.events?.length) return;
        if (activeFilterCat && node.category !== activeFilterCat)    return;

        const matches = [];

        // Class name match (all scope only)
        if (!membersOnly && node.id.toLowerCase().includes(search)) {
            matches.push({ kind: "class", name: node.id, member: null });
        }

        // Props
        (node.props || []).forEach(p => {
            const hit = p.name.toLowerCase().includes(search) ||
                (!membersOnly && (p.description || "").toLowerCase().includes(search));
            if (hit) matches.push({ kind: "prop", name: p.name, member: p });
        });

        // Methods
        (node.methods || []).forEach(m => {
            const hit = m.name.toLowerCase().includes(search) ||
                (!membersOnly && (m.description || "").toLowerCase().includes(search));
            if (hit) matches.push({ kind: "method", name: m.name, member: m });
        });

        // Events
        (node.events || []).forEach(e => {
            const hit = e.name.toLowerCase().includes(search) ||
                (!membersOnly && (e.description || "").toLowerCase().includes(search));
            if (hit) matches.push({ kind: "event", name: e.name, member: e });
        });

        if (matches.length > 0) {
            results.push({ node, matches });
        }
    });

    // Sort by class name
    results.sort((a, b) => a.node.id.localeCompare(b.node.id));

    if (results.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No results";
        li.style.cssText = "color:#999;font-style:italic;padding:10px;";
        list.appendChild(li);
        return;
    }

    results.forEach(({ node, matches }) => {
        // Class group header — clicking focuses the node
        const header = document.createElement("div");
        header.className = "member-class-group";
        header.textContent = node.id;
        header.dataset.id = node.id;
        header.addEventListener("click", () => focusOnClass(node.id, 1.4));
        list.appendChild(header);

        // Individual member rows — clicking focuses node AND opens dialog
        matches.forEach(({ kind, name, member }) => {
            if (kind === "class") return; // class name match — header is enough
            const row = document.createElement("div");
            row.className = "member-result";

            const badge = document.createElement("span");
            badge.className = `member-badge ${kind}`;
            badge.textContent = kind === "prop" ? "P" : kind === "method" ? "M" : "E";

            const label = document.createElement("span");
            label.textContent = name;

            row.appendChild(badge);
            row.appendChild(label);

            // Click: focus class node, then fire the detail dialog for this member
            row.addEventListener("click", () => {
                focusOnClass(node.id, 1.4);
                // After pan/zoom animation, find the clickable element and trigger dialog
                setTimeout(() => {
                    const cell = graph.getCell(node.id);
                    if (!cell) return;
                    const cellView = paper.findViewByModel(cell);
                    if (!cellView) return;
                    // Find the matching clickable div inside the foreignObject
                    const fo = cellView.el.querySelector(".ls-content");
                    if (!fo) return;
                    const clickables = fo.querySelectorAll(".clickable");
                    for (const el of clickables) {
                        if (el.dataset.name === name) {
                            el.click();
                            break;
                        }
                    }
                }, 600);
            });

            list.appendChild(row);
        });
    });
}

// Dim/highlight nodes on the canvas based on active filter AND search term.
// A node is "active" if it passes both the type filter and the search term.
// Active nodes: full opacity + search-highlight ring if a search is active.
// Inactive nodes: dimmed. Links dim if either endpoint is inactive.
function applyFilterToCanvas() {
    const search = document.getElementById('class-search').value.toLowerCase().trim();

    graph.getElements().forEach(el => {
        const node = LS_CLASSES.nodes.find(n => n.id === el.id);
        if (!node) return;

        const passesFilter = isNodeVisible(node);
        let passesSearch;
        if (!search) {
            passesSearch = true;
        } else if (activeSearchScope === "members") {
            passesSearch = (node.props  || []).some(p => p.name.toLowerCase().includes(search)) ||
                           (node.methods|| []).some(m => m.name.toLowerCase().includes(search)) ||
                           (node.events || []).some(e => e.name.toLowerCase().includes(search));
        } else if (activeSearchScope === "all") {
            passesSearch = node.id.toLowerCase().includes(search) ||
                           (node.props  || []).some(p => p.name.toLowerCase().includes(search) || (p.description||"").toLowerCase().includes(search)) ||
                           (node.methods|| []).some(m => m.name.toLowerCase().includes(search) || (m.description||"").toLowerCase().includes(search)) ||
                           (node.events || []).some(e => e.name.toLowerCase().includes(search));
        } else {
            passesSearch = node.id.toLowerCase().includes(search);
        }
        const active = passesFilter && passesSearch;

        el.attr('root/opacity', active ? 1 : DIM_OPACITY);

        // Search highlight ring — thicken and recolour the body stroke
        if (search && active) {
            el.attr('.ls-body/stroke', '#e67e00');
            el.attr('.ls-body/strokeWidth', 3);
        } else {
            el.attr('.ls-body/stroke', '#333');
            el.attr('.ls-body/strokeWidth', 1);
        }
    });

    // Dim links where either endpoint is inactive
    graph.getLinks().forEach(link => {
        if (!linksVisible) return;
        const src = LS_CLASSES.nodes.find(n => n.id === link.getSourceCell()?.id);
        const tgt = LS_CLASSES.nodes.find(n => n.id === link.getTargetCell()?.id);
        const srcActive = src && isNodeVisible(src) &&
                          (!search || src.id.toLowerCase().includes(search));
        const tgtActive = tgt && isNodeVisible(tgt) &&
                          (!search || tgt.id.toLowerCase().includes(search));
        link.attr('root/opacity', (srcActive && tgtActive) ? 1 : LINK_DIM_OPACITY);
    });
}

function isNodeVisible(node) {
    if (!node) return false;
    if (activeFilterCat)                return node.category === activeFilterCat;
    if (activeFilterType === 'ui')      return node.isUI;
    if (activeFilterType === 'backend') return !node.isUI;
    if (activeFilterType === 'events')  return !!(node.events?.length);
    return true; // 'all'
}



// ================================================================
// Chunk 4 — Focus, interactivity, dialog, zoom/pan, sidebar actions
// ================================================================

// Focus on a class node
function focusOnClass(classId, zoom = 1.2) {
    const cell = graph.getCell(classId);
    if (!cell) return;

    paper.scale(zoom, zoom);
    document.getElementById('zoom-level').value = Math.round(zoom * 100) + '%';

    const bb = cell.getBBox();
    const w = document.getElementById("paper-container").clientWidth;
    const h = document.getElementById("paper-container").clientHeight;

    const tx = (w / 2) - (bb.x + bb.width / 2) * zoom;
    const ty = (h / 2) - (bb.y + bb.height / 2) * zoom;

    paper.translate(tx, ty);

    document.querySelectorAll('#class-list li').forEach(li => {
        li.style.background = '';
        li.style.color = '';
    });
    const selected = document.querySelector(`#class-list li[data-id='${classId}']`);
    if (selected) {
        selected.style.background = '#ffcc00';
        selected.style.color = '#000';
    }
}

// Create and manage dialog
const dialog = document.createElement('div');
dialog.id = 'dialog';
document.body.appendChild(dialog);

function showDialog(html) {
    // Toolbar: expand toggle + close button
    const toolbar = `
        <div id="dialog-toolbar">
            <button id="dialog-expand" title="Expand dialog">⤢</button>
            <button id="dialog-close" title="Close">✕</button>
        </div>`;
    dialog.innerHTML = toolbar + html;
    dialog.style.display = 'block';
    dialog.classList.remove('expanded');

    // Expand/collapse toggle
    dialog.querySelector('#dialog-expand').addEventListener('click', (e) => {
        e.stopPropagation();
        const expanded = dialog.classList.toggle('expanded');
        e.currentTarget.textContent = expanded ? '⤡' : '⤢';
        e.currentTarget.title = expanded ? 'Collapse dialog' : 'Expand dialog';
    });

    // Close button
    dialog.querySelector('#dialog-close').addEventListener('click', (e) => {
        e.stopPropagation();
        dialog.style.display = 'none';
        dialog.classList.remove('expanded');
    });
}

// Clickable metadata elements (props/methods)
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('clickable')) {
        e.stopPropagation();

        const name = e.target.dataset.name;
        const desc = e.target.dataset.description || 'No description provided.';
        const type = e.target.dataset.type;
        const url = e.target.dataset.docurl;

        let params = e.target.getAttribute('data-params');
        try { params = JSON.parse(params); } catch { params = []; }

        let ret = e.target.getAttribute('data-returns');
        try { ret = JSON.parse(ret); } catch { ret = null; }

        const syntax = e.target.dataset.syntax;

        let html = `<h3>${name}</h3>`;

        if (syntax) {
            html += `<pre class="dialog-syntax">${syntax}</pre>`;
        }

        if (Array.isArray(params) && params.length > 0) {
            html += `<p><b>Parameters:</b></p><ul>`;
            params.forEach(p => {
                if (typeof p === 'string') html += `<li>${p}</li>`;
                else html += `<li><b>${p.name}</b>${p.type ? ': ' + p.type : ''}${p.description ? ' — ' + p.description : ''}</li>`;
            });
            html += `</ul>`;
        }

        if (ret && (ret.name || ret.description)) {
            html += `<p><b>Returns:</b> <em>${ret.name}</em>${ret.description ? ' — ' + ret.description : ''}</p>`;
        }
        if (type) html += `<p><b>Type:</b> ${type}</p>`;
        if (e.target.dataset.comonly === "true") html += `<p><span style="background:#888;color:#fff;padding:1px 5px;border-radius:2px;font-size:11px">COM/OLE only</span></p>`;
        if (e.target.dataset.notsupportedbycom === "true") html += `<p><span style="background:#c0392b;color:#fff;padding:1px 5px;border-radius:2px;font-size:11px">Not supported by COM</span></p>`;
        if (desc) html += `<p>${desc}</p>`;
        if (url) html += `<p><a href="${url}" target="_blank">Open documentation ↗</a></p>`;
        const exampleUrl = e.target.dataset.example;
        if (exampleUrl) html += `<p><a href="${exampleUrl}" target="_blank">View example ↗</a></p>`;

        showDialog(html);
    } else if (!dialog.contains(e.target)) {
        dialog.style.display = 'none';
    }
});

// Sidebar search
// ── Dropdown open/close ──────────────────────────────────────────────────────
document.querySelectorAll('.strip-dropdown').forEach(dropdown => {
    const toggle = dropdown.querySelector('.strip-dropdown-toggle');
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        // Close all dropdowns first
        document.querySelectorAll('.strip-dropdown').forEach(d => d.classList.remove('open'));
        if (!isOpen) dropdown.classList.add('open');
    });
});

// Click anywhere outside closes all dropdowns
document.addEventListener('click', () => {
    document.querySelectorAll('.strip-dropdown').forEach(d => d.classList.remove('open'));
});

// ── Type filter ──────────────────────────────────────────────────────────────
// activeFilterType: 'all' | 'ui' | 'backend' | 'events'
// activeFilterCat:  '' | category string (from node.category)
let activeFilterType = 'all';
let activeFilterCat  = '';

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        clearHighlight();

        const fType = btn.dataset.filterType;
        const fCat  = btn.dataset.filterCat;

        if (fType !== undefined) {
            activeFilterType = fType;
            activeFilterCat  = '';                  // clear category when type chosen
        } else if (fCat !== undefined) {
            activeFilterCat  = fCat;
            activeFilterType = 'all';               // clear type when category chosen
        }

        // Update active state
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update Filter toggle label
        const filterToggle = document.querySelector('#filter-dropdown .strip-dropdown-toggle');
        if (filterToggle) {
            const typeLabels = { all: 'Filter ▾', ui: 'UI ▾', backend: 'Backend ▾', events: 'Events ▾' };
            filterToggle.textContent = activeFilterCat
                ? `${activeFilterCat} ▾`
                : (typeLabels[activeFilterType] || 'Filter ▾');
        }

        // Close dropdown after selection
        document.getElementById('filter-dropdown')?.classList.remove('open');

        populateSidebar();
    });
});

const searchBox   = document.getElementById('class-search');
const searchClear = document.getElementById('search-clear');

// ── Search scope ──────────────────────────────────────────────────────────────
let activeSearchScope = 'classes';  // 'classes' | 'members' | 'all'

document.querySelectorAll('.scope-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.scope-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeSearchScope = btn.dataset.scope;
        // Update placeholder to guide the user
        const placeholders = {
            classes: 'Search classes...',
            members: 'Search methods & properties...',
            all:     'Search everything...',
        };
        searchBox.placeholder = placeholders[activeSearchScope];
        updateSearchClear();
        populateSidebar();
        applyFilterToCanvas();
    });
});

function updateSearchClear() {
    searchClear.style.display = searchBox.value.length > 0 ? 'block' : 'none';
}

let searchDebounceTimer = null;
const SEARCH_DEBOUNCE_MS = 500;  // wait 500ms after last keystroke before searching

searchBox.addEventListener('input', () => {
    updateSearchClear();
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => populateSidebar(), SEARCH_DEBOUNCE_MS);
});

searchClear.addEventListener('click', () => {
    searchBox.value = '';
    updateSearchClear();
    populateSidebar();
    applyFilterToCanvas();
    searchBox.focus();
});

// Also re-run sidebar when scope changes with existing search term
// (handled in scope-btn click above)

// Sidebar click selects class
const classList = document.getElementById('class-list');
classList.addEventListener('click', e => {
    if (e.target.tagName === 'LI') {
        focusOnClass(e.target.dataset.id, 1.4);
    }
});

// ── Neighbour highlight on node hover ────────────────────────────────────────
// When hovering a node: dim all unrelated cells, brighten connected links.
// Opacity levels chosen to keep the hovered node crisp while the context
// fades enough to make relationships immediately readable.
const DIM_OPACITY        = 0.08;   // unrelated nodes & links
const LINK_DIM_OPACITY   = 0.06;
const LINK_HIGHLIGHT_OPACITY = 1;
const HIGHLIGHT_STROKE   = 2;      // px — connected link stroke width
const NORMAL_STROKE      = 1;

// Neighbour highlight thresholds
const HIGHLIGHT_ZOOM_THRESHOLD = 0.8;  // only active when zoomed out to 80% or less
const HIGHLIGHT_DELAY_MS       = 350;  // ms pause required before highlight fires
                                       // — prevents triggering on drag or casual pan

let highlightActive = false;
let highlightTimer  = null;

function applyHighlight(centreId) {
    highlightActive = true;

    // Collect the IDs of directly connected links and neighbour nodes
    const connectedLinkIds  = new Set();
    const neighbourNodeIds  = new Set([centreId]);

    graph.getLinks().forEach(link => {
        const srcId = link.getSourceCell()?.id;
        const tgtId = link.getTargetCell()?.id;
        if (srcId === centreId || tgtId === centreId) {
            connectedLinkIds.add(link.id);
            if (srcId) neighbourNodeIds.add(srcId);
            if (tgtId) neighbourNodeIds.add(tgtId);
        }
    });

    // Dim / brighten nodes
    graph.getElements().forEach(el => {
        const related = neighbourNodeIds.has(el.id);
        el.attr('root/opacity', related ? 1 : DIM_OPACITY);
    });

    // Dim / brighten links (respect linksVisible toggle)
    graph.getLinks().forEach(link => {
        if (!linksVisible) return;
        const connected = connectedLinkIds.has(link.id);
        link.attr('root/opacity', connected ? LINK_HIGHLIGHT_OPACITY : LINK_DIM_OPACITY);
        link.attr('line/strokeWidth', connected ? HIGHLIGHT_STROKE : NORMAL_STROKE);
    });
}

function clearHighlight() {
    // Cancel any pending highlight that hasn't fired yet
    clearTimeout(highlightTimer);
    highlightTimer = null;

    if (!highlightActive) return;
    highlightActive = false;

    graph.getLinks().forEach(link => {
        link.attr('line/strokeWidth', NORMAL_STROKE);
    });

    // Recompute filter + search state rather than blindly restoring to 1,
    // so search rings and filter dimming are preserved after hover ends.
    applyFilterToCanvas();
}

// ── Links panel ──────────────────────────────────────────────────────────────
const linksPanel        = document.getElementById('links-panel');
const linksPanelTitle   = document.getElementById('links-panel-title');
const linksPanelBody    = document.getElementById('links-panel-body');
const linksPanelExpand  = document.getElementById('links-panel-expand');

linksPanelExpand.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = linksPanel.classList.toggle('expanded');
    linksPanelExpand.textContent = expanded ? '⤡' : '⤢';
    linksPanelExpand.title = expanded ? 'Collapse panel' : 'Expand panel';
});

function showLinksPanel(centreId) {
    const outgoing = LS_CLASSES.links
        .filter(l => l.source === centreId)
        .sort((a, b) => a.target.localeCompare(b.target));
    const incoming = LS_CLASSES.links
        .filter(l => l.target === centreId)
        .sort((a, b) => a.source.localeCompare(b.source));

    if (outgoing.length === 0 && incoming.length === 0) return;

    linksPanelTitle.textContent = centreId;
    linksPanelBody.innerHTML = '';

    function addSection(label, links, nameKey) {
        if (links.length === 0) return;
        const sec = document.createElement('div');
        sec.className = 'links-panel-section';
        sec.textContent = label;
        linksPanelBody.appendChild(sec);

        links.forEach(link => {
            const nid     = link[nameKey];
            const members = link.members || [];

            // Class name row — clicking focuses the node
            const item = document.createElement('div');
            item.className = 'links-panel-item links-panel-class';
            item.textContent = nid;
            item.title = nid;
            item.addEventListener('click', () => {
                hideLinksPanel();
                focusOnClass(nid, 1.4);
            });
            linksPanelBody.appendChild(item);

            // Member rows with syntax — one per method/prop that creates the link
            members.forEach(m => {
                const mrow = document.createElement('div');
                mrow.className = 'links-panel-member';

                const badge = document.createElement('span');
                badge.className = `links-panel-badge ${m.kind}`;
                badge.textContent = m.kind === 'prop' ? 'P' : 'M';

                const nameEl = document.createElement('span');
                nameEl.className = 'links-panel-member-name';
                nameEl.textContent = m.name;

                mrow.appendChild(badge);
                mrow.appendChild(nameEl);

                // Syntax block — only if available
                if (m.syntax) {
                    // Take first line only — keeps panel compact
                    const firstLine = m.syntax.split('\n')[0].trim();
                    const synEl = document.createElement('div');
                    synEl.className = 'links-panel-syntax';
                    synEl.textContent = firstLine;
                    mrow.appendChild(synEl);
                }

                linksPanelBody.appendChild(mrow);
            });
        });
    }

    addSection('Links to',   outgoing, 'target');
    addSection('Links from', incoming, 'source');

    // ── Position panel away from the hovered node ─────────────────────────────
    // Default to top-left (the most reliable clear space on the canvas).
    // Only shift to another corner if the hovered node actually overlaps
    // the panel's bounding box in screen coordinates.
    const cell = graph.getCell(centreId);
    const SIDEBAR_W = 280;
    const MARGIN    = 18;
    const NODE_W    = 260;
    const NODE_H    = 200;
    const PANEL_W   = linksPanel.classList.contains('expanded') ? 560 : 380;   // matches CSS
    const PANEL_H   = 340;   // generous estimate incl title + items

    linksPanel.style.display = 'block';

    // Reset all corners
    linksPanel.style.top    = '';
    linksPanel.style.bottom = '';
    linksPanel.style.left   = '';
    linksPanel.style.right  = '';

    if (cell) {
        const pos       = cell.position();
        const scale     = paper.scale().sx;
        const translate = paper.translate();

        // Node bounding box in screen coordinates
        const nodeLeft   = SIDEBAR_W + translate.tx + pos.x * scale;
        const nodeTop    = translate.ty + pos.y * scale;
        const nodeRight  = nodeLeft + NODE_W * scale;
        const nodeBottom = nodeTop  + NODE_H * scale;

        // Panel candidates: [top, left] for each corner
        // top-left, top-right, bottom-left, bottom-right
        const candidates = [
            { top: MARGIN,  left: SIDEBAR_W + MARGIN,  bottom: null, right: null },
            { top: MARGIN,  right: MARGIN,              bottom: null, left: null  },
            { bottom: MARGIN, left: SIDEBAR_W + MARGIN, top: null,   right: null },
            { bottom: MARGIN, right: MARGIN,             top: null,   left: null  },
        ];

        // Screen width/height for computing panel screen position
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        function panelScreenRect(c) {
            const px = c.right  != null ? vw - MARGIN - PANEL_W : (c.left  ?? SIDEBAR_W + MARGIN);
            const py = c.bottom != null ? vh - MARGIN - PANEL_H : (c.top   ?? MARGIN);
            return { x: px, y: py, x2: px + PANEL_W, y2: py + PANEL_H };
        }

        function overlapsNode(c) {
            const r = panelScreenRect(c);
            return !(r.x2 < nodeLeft || r.x > nodeRight ||
                     r.y2 < nodeTop  || r.y > nodeBottom);
        }

        // Also avoid the legend (bottom-right) and zoom widget (bottom-left)
        const legendEl = document.getElementById('map-legend');
        const zoomEl   = document.getElementById('zoom-widget');

        function overlapsWidget(c, el) {
            if (!el || el.style.display === 'none') return false;
            const er = el.getBoundingClientRect();
            const pr = panelScreenRect(c);
            return !(pr.x2 < er.left || pr.x > er.right ||
                     pr.y2 < er.top  || pr.y > er.bottom);
        }

        // Pick first candidate that doesn't overlap the node or fixed widgets
        let chosen = candidates[0];
        for (const c of candidates) {
            if (!overlapsNode(c) &&
                !overlapsWidget(c, legendEl) &&
                !overlapsWidget(c, zoomEl)) {
                chosen = c;
                break;
            }
        }

        if (chosen.top    != null) linksPanel.style.top    = chosen.top    + 'px';
        if (chosen.bottom != null) linksPanel.style.bottom = chosen.bottom + 'px';
        if (chosen.left   != null) linksPanel.style.left   = chosen.left   + 'px';
        if (chosen.right  != null) linksPanel.style.right  = chosen.right  + 'px';
    } else {
        // Fallback — no cell found, just use top-left
        linksPanel.style.top  = MARGIN + 'px';
        linksPanel.style.left = (SIDEBAR_W + MARGIN) + 'px';
    }
}

let linksPanelCloseTimer = null;

function hideLinksPanel() {
    linksPanel.style.display = 'none';
    linksPanel.classList.remove('expanded');
    linksPanelExpand.textContent = '⤢';
    linksPanelExpand.title = 'Expand panel';
    linksPanelBody.innerHTML = '';
    clearTimeout(linksPanelCloseTimer);
    linksPanelCloseTimer = null;
}

function scheduleLinksPanelClose() {
    clearTimeout(linksPanelCloseTimer);
    linksPanelCloseTimer = setTimeout(() => hideLinksPanel(), 500);
}

function cancelLinksPanelClose() {
    clearTimeout(linksPanelCloseTimer);
    linksPanelCloseTimer = null;
}

paper.on('element:mouseenter', (elementView) => {
    // Cancel any pending panel close — mouse moved from panel back to a node
    cancelLinksPanelClose();

    // Only activate highlight/panel at or below the zoom threshold
    if (paper.scale().sx > HIGHLIGHT_ZOOM_THRESHOLD) return;

    // Schedule highlight and links panel after delay
    const id = elementView.model.id;
    clearTimeout(highlightTimer);
    highlightTimer = setTimeout(() => {
        applyHighlight(id);
        showLinksPanel(id);
    }, HIGHLIGHT_DELAY_MS);
});

paper.on('element:mouseleave', (elementView, evt) => {
    clearHighlight();
    // Schedule close — cancelled if mouse enters the panel within 500ms
    const related = evt.relatedTarget;
    if (!related || !linksPanel.contains(related)) {
        scheduleLinksPanelClose();
    }
});

// Schedule close when mouse leaves the panel — cancelled if it re-enters
linksPanel.addEventListener('mouseleave', () => {
    scheduleLinksPanelClose();
});

// Cancel close when mouse enters the panel
linksPanel.addEventListener('mouseenter', () => {
    cancelLinksPanelClose();
});

// Also clear when clicking blank space or starting a drag
paper.on('blank:pointerdown', () => {
    clearHighlight();
    hideLinksPanel();
});

paper.on('element:pointerdown', () => {
    clearHighlight();
    hideLinksPanel();
});

// Panning
paper.on('blank:pointerdown', evt => {
    const start = paper.translate();
    const sx = evt.clientX;
    const sy = evt.clientY;

    function moveHandler(e) {
        paper.translate(start.tx + (e.clientX - sx), start.ty + (e.clientY - sy));
    }

    function upHandler() {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
    }

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
});

// Zooming
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 0.1;
const zoomDisplay = document.getElementById('zoom-level');

function applyZoom(newScale, cx, cy) {
    newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newScale));
    newScale = Math.round(newScale * 100) / 100;

    const oldScale = paper.scale().sx;
    const { tx, ty } = paper.translate();

    // If no pivot point supplied (button zoom), use the canvas-space point
    // currently at the centre of the viewport as the pivot.
    if (cx === undefined || cy === undefined) {
        const container = document.getElementById('paper-container');
        cx = (container.clientWidth  / 2 - tx) / oldScale;
        cy = (container.clientHeight / 2 - ty) / oldScale;
    }

    // Apply scale without a pivot argument (JointJS 3.x pivot args are
    // unreliable), then manually adjust the translation so the pivot point
    // stays fixed on screen — the same maths the mousewheel handler uses.
    paper.scale(newScale, newScale);
    paper.translate(
        tx - cx * (newScale - oldScale),
        ty - cy * (newScale - oldScale)
    );

    zoomDisplay.value = Math.round(newScale * 100) + '%';
}

// ── Label visibility ─────────────────────────────────────────────────────────
// Labels are shown on hover, but only when zoom is above this threshold.
// Below it they would be too small to read so hover does nothing.
const LABEL_ZOOM_THRESHOLD = 0.6;

function setLinkLabelVisible(link, visible) {
    const display = visible ? "block" : "none";
    link.labels().forEach((_, i) => {
        link.label(i, {
            attrs: {
                text:  { display },
                rect:  { display },
            }
        });
    });
}

function updateAllLabelsForZoom(scale) {
    // Labels: hide any visible ones when zooming below their threshold
    if (scale < LABEL_ZOOM_THRESHOLD) {
        graph.getLinks().forEach(link => setLinkLabelVisible(link, false));
    }
    // Highlight: clear any pending or active highlight when zooming above threshold
    if (scale > HIGHLIGHT_ZOOM_THRESHOLD) {
        clearHighlight();
        hideLinksPanel();
    }
}

// Extend applyZoom to trigger label visibility check
const _applyZoomOrig = applyZoom;
applyZoom = function(newScale, cx, cy) {
    _applyZoomOrig(newScale, cx, cy);
    updateAllLabelsForZoom(paper.scale().sx);
};

// Hover: show label on mouseenter, hide on mouseleave — only above threshold
paper.on('link:mouseenter', (linkView) => {
    if (paper.scale().sx < LABEL_ZOOM_THRESHOLD) return;
    setLinkLabelVisible(linkView.model, true);
});

paper.on('link:mouseleave', (linkView) => {
    setLinkLabelVisible(linkView.model, false);
});

// Mousewheel zoom — smoother smaller steps
paper.on('blank:mousewheel', (evt, x, y, delta) => {
    evt.preventDefault();
    const current = paper.scale().sx;
    applyZoom(current + delta * ZOOM_STEP, x, y);
});

// +/- buttons
document.getElementById('btn-zoom-in').addEventListener('click', () => {
    applyZoom(paper.scale().sx + ZOOM_STEP);
});
document.getElementById('btn-zoom-out').addEventListener('click', () => {
    applyZoom(paper.scale().sx - ZOOM_STEP);
});

// Editable zoom field — accepts numeric entry, applies on Enter or blur
zoomDisplay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        applyZoomFromField();
        zoomDisplay.blur();
    } else if (e.key === 'Escape') {
        // Restore current zoom value and abandon edit
        zoomDisplay.value = Math.round(paper.scale().sx * 100) + '%';
        zoomDisplay.blur();
    } else if (!/[\d]/.test(e.key) && !['ArrowLeft','ArrowRight','Delete','Tab','Home','End'].includes(e.key)) {
        // Block non-numeric keys (allow digits, backspace, navigation)
        e.preventDefault();
    }
});

zoomDisplay.addEventListener('focus', () => {
    // Strip the % so the user sees a plain number to edit
    zoomDisplay.value = Math.round(paper.scale().sx * 100).toString();
    zoomDisplay.select();
});

zoomDisplay.addEventListener('blur', () => {
    applyZoomFromField();
});

function applyZoomFromField() {
    const raw = parseInt(zoomDisplay.value, 10);
    if (!isNaN(raw) && raw > 0) {
        applyZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, raw / 100)));
    } else {
        // Restore display if entry was invalid
        zoomDisplay.value = Math.round(paper.scale().sx * 100) + '%';
    }
}

// Toolbar buttons
const btnHome = document.getElementById('btn-home');
btnHome.addEventListener('click', () => {
    paper.scaleContentToFit({ padding: 50 });
    zoomDisplay.value = Math.round(paper.scale().sx * 100) + '%';
});

let linksVisible = true;
const btnLinks = document.getElementById('btn-toggle-links');
btnLinks.addEventListener('click', () => {
    clearHighlight();   // reset any in-progress hover state before toggling
    linksVisible = !linksVisible;
    graph.getLinks().forEach(link => link.attr('root/opacity', linksVisible ? 1 : 0));
    // Visual feedback — dim the icon when links are hidden
    btnLinks.style.opacity = linksVisible ? '1' : '0.4';
    btnLinks.title = linksVisible ? 'Hide connections' : 'Show connections';
});



// ================================================================
// Chunk 5 — Auto-save Layout + Engine Initialization
// ================================================================

// ── Toast notification (shared by layout system and easter egg) ───────────────
let _toastTimer = null;
function showToast(msg) {
    const toast = document.getElementById('retro-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

const LAYOUT_STORAGE_KEY = 'ls_classmap_layout_v2';

// ── Persist all node positions to localStorage ────────────────────────────────
function saveLayout() {
    const positions = {};
    LS_CLASSES.nodes.forEach(node => {
        const cell = graph.getCell(node.id);
        if (!cell) return;
        const pos = cell.position();
        positions[node.id] = { x: pos.x, y: pos.y };
    });
    try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(positions));
    } catch(e) {
        console.warn('Layout save failed:', e);
    }
}

// ── Restore saved positions, returns true if any were applied ─────────────────
function restoreLayout() {
    try {
        const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
        if (!raw) return false;
        const positions = JSON.parse(raw);
        let restored = 0;
        Object.entries(positions).forEach(([id, pos]) => {
            const cell = graph.getCell(id);
            if (cell) {
                cell.position(pos.x, pos.y);
                cell.set('prepositioned', true);
                restored++;
            }
        });
        return restored > 0;
    } catch(e) {
        console.warn('Layout restore failed:', e);
        return false;
    }
}

// ── Auto-save on every drag-end ───────────────────────────────────────────────
paper.on('cell:pointerup', (cellView) => {
    // Only save when a node (not a link) is moved
    if (cellView.model.isLink()) return;
    saveLayout();
    showToast('📌 Layout saved');
});

// ── Reset button — clears saved layout and returns to default ─────────────────
const btnSave = document.getElementById('btn-save-layout');
btnSave.title = 'Reset Layout to Default';
btnSave.textContent = '↺ Reset';
btnSave.addEventListener('click', () => {
    if (!confirm('Reset the layout to the default positions? Your saved arrangement will be lost.')) return;
    try {
        localStorage.removeItem(LAYOUT_STORAGE_KEY);
    } catch(e) { /* ignore */ }
    // Re-render from JSON coordinates (clears prepositioned flags via full re-render)
    graph.clear();
    renderClasses();
    setTimeout(() => {
        paper.scaleContentToFit({ padding: 50 });
        zoomDisplay.value = Math.round(paper.scale().sx * 100) + '%';
        showToast('↺ Layout reset to default');
    }, 100);
});

// ── Engine initialization — restore saved layout if available ─────────────────
window.initializeClassMap = function() {
    renderClasses();
    const hasSaved = restoreLayout();
    if (hasSaved) {
        // Fit the restored layout, don't snap to NotesSession
        setTimeout(() => {
            paper.scaleContentToFit({ padding: 50 });
            zoomDisplay.value = Math.round(paper.scale().sx * 100) + '%';
            showToast('📌 Layout restored');
        }, 100);
    } else {
        // First visit — focus on NotesSession as before
        setTimeout(() => focusOnClass('NotesSession', 1.2), 300);
    }
};

// ── Legend collapse toggle ───────────────────────────────────────────────────
(function() {
    const toggle = document.getElementById('legend-toggle');
    const body   = document.getElementById('legend-body');
    if (!toggle || !body) return;

    toggle.addEventListener('click', () => {
        const collapsed = body.classList.toggle('collapsed');
        toggle.textContent = collapsed ? '▼' : '▲';
        toggle.title = collapsed ? 'Expand legend' : 'Collapse legend';
    });
})();

// End of engine.js