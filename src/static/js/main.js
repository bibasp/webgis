// Main JavaScript for WebGIS Application

// Global variables
let map;
let layers = {};
let activeLayer = null;
let selectedFeature = null;
let editingMode = null;
let drawingLayer = null;

// Initialize the map when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    setupEventListeners();
    loadLayers();
});

// Initialize Leaflet map
function initMap() {
    map = L.map('map').setView([0, 0], 2);
    
    // Add base layers
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });
    
    const baseLayers = {
        "OpenStreetMap": osm,
        "Satellite": satellite
    };
    
    L.control.layers(baseLayers, {}, {collapsed: false}).addTo(map);
    
    // Add scale control
    L.control.scale().addTo(map);
}

// Set up event listeners for UI elements
function setupEventListeners() {
    // Add data button
    document.getElementById('btn-add-data').addEventListener('click', function() {
        const modal = new bootstrap.Modal(document.getElementById('addDataModal'));
        modal.show();
    });
    
    // Upload file button
    document.getElementById('btn-upload-file').addEventListener('click', uploadFile);
    
    // Add WMTS button
    document.getElementById('btn-add-wmts').addEventListener('click', function() {
        const modal = new bootstrap.Modal(document.getElementById('addWmtsModal'));
        modal.show();
    });
    
    // Add WMTS layer button
    document.getElementById('btn-add-wmts-layer').addEventListener('click', addWmtsLayer);
    
    // Create layer buttons
    document.getElementById('create-point-layer').addEventListener('click', function() {
        showCreateLayerModal('point');
    });
    
    document.getElementById('create-line-layer').addEventListener('click', function() {
        showCreateLayerModal('line');
    });
    
    document.getElementById('create-polygon-layer').addEventListener('click', function() {
        showCreateLayerModal('polygon');
    });
    
    // Add field button in create layer modal
    document.getElementById('btn-add-layer-field').addEventListener('click', addFieldToForm);
    
    // Create layer button
    document.getElementById('btn-create-layer').addEventListener('click', createNewLayer);
    
    // Editing tools
    document.getElementById('tool-select').addEventListener('click', activateSelectTool);
    document.getElementById('tool-draw').addEventListener('click', activateDrawTool);
    document.getElementById('tool-edit').addEventListener('click', activateEditTool);
    document.getElementById('tool-delete').addEventListener('click', activateDeleteTool);
    
    // Edit attributes button
    document.getElementById('btn-edit-attributes').addEventListener('click', showEditAttributesModal);
    
    // Save attributes button
    document.getElementById('btn-save-attributes').addEventListener('click', saveAttributes);
    
    // Add field to feature button
    document.getElementById('btn-add-field').addEventListener('click', showAddFieldModal);
    
    // Save new field button
    document.getElementById('btn-save-new-field').addEventListener('click', addFieldToFeature);
}

// Load layers from the server
function loadLayers() {
    fetch('/api/layers')
        .then(response => response.json())
        .then(data => {
            const layersList = document.getElementById('layers-list');
            layersList.innerHTML = '';
            
            if (data.layers && data.layers.length > 0) {
                data.layers.forEach(layer => {
                    addLayerToList(layer);
                });
            } else {
                layersList.innerHTML = '<p class="text-muted p-2">No layers available. Add data or create a new layer.</p>';
            }
        })
        .catch(error => {
            console.error('Error loading layers:', error);
            showToast('Error loading layers', 'danger');
        });
}

// Add a layer to the layers list
function addLayerToList(layer) {
    const layersList = document.getElementById('layers-list');
    const layerItem = document.createElement('div');
    layerItem.className = 'layer-item d-flex justify-content-between align-items-center';
    layerItem.dataset.layerId = layer.id;
    
    const layerIcon = getLayerIcon(layer.type);
    
    layerItem.innerHTML = `
        <div>
            <span class="me-2">${layerIcon}</span>
            <span>${layer.name}</span>
        </div>
        <div class="layer-controls">
            <button class="btn btn-sm btn-outline-secondary btn-visibility" title="Toggle visibility">
                <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger btn-remove" title="Remove layer">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;
    
    layersList.appendChild(layerItem);
    
    // Add event listeners
    layerItem.addEventListener('click', function(e) {
        if (!e.target.closest('.btn')) {
            selectLayer(layer.id);
        }
    });
    
    const visibilityBtn = layerItem.querySelector('.btn-visibility');
    visibilityBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleLayerVisibility(layer.id);
    });
    
    const removeBtn = layerItem.querySelector('.btn-remove');
    removeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        removeLayer(layer.id);
    });
}

// Get appropriate icon for layer type
function getLayerIcon(type) {
    switch (type) {
        case 'point':
            return '<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><circle cx="8" cy="8" r="4" fill="currentColor"/></svg>';
        case 'line':
        case 'polyline':
            return '<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2 5L14 11" stroke="currentColor" stroke-width="2"/></svg>';
        case 'polygon':
        case 'area':
            return '<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><polygon points="2,14 8,2 14,14" fill="currentColor"/></svg>';
        default:
            return '<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" fill="currentColor"/></svg>';
    }
}

// Select a layer
function selectLayer(layerId) {
    // Update UI
    const layerItems = document.querySelectorAll('.layer-item');
    layerItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.layerId == layerId) {
            item.classList.add('active');
        }
    });
    
    // Set active layer
    activeLayer = layers[layerId];
    
    // Enable editing tools
    const editingTools = document.querySelectorAll('#editing-tools button');
    editingTools.forEach(button => {
        button.disabled = false;
    });
    
    // Clear selected feature
    if (selectedFeature) {
        unselectFeature();
    }
}

// Toggle layer visibility
function toggleLayerVisibility(layerId) {
    const layer = layers[layerId];
    if (layer) {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        } else {
            map.addLayer(layer);
        }
        
        // Update button icon
        const layerItem = document.querySelector(`.layer-item[data-layer-id="${layerId}"]`);
        const visibilityBtn = layerItem.querySelector('.btn-visibility i');
        if (map.hasLayer(layer)) {
            visibilityBtn.className = 'bi bi-eye';
        } else {
            visibilityBtn.className = 'bi bi-eye-slash';
        }
    }
}

// Remove a layer
function removeLayer(layerId) {
    if (confirm('Are you sure you want to remove this layer?')) {
        const layer = layers[layerId];
        if (layer) {
            map.removeLayer(layer);
            delete layers[layerId];
            
            // Remove from UI
            const layerItem = document.querySelector(`.layer-item[data-layer-id="${layerId}"]`);
            layerItem.remove();
            
            // If this was the active layer, disable editing tools
            if (activeLayer === layer) {
                activeLayer = null;
                const editingTools = document.querySelectorAll('#editing-tools button');
                editingTools.forEach(button => {
                    button.disabled = true;
                });
            }
        }
    }
}

// Upload GIS file
function uploadFile() {
    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Please select a file', 'warning');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    showLoading();
    
    fetch('/api/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        
        if (data.success) {
            showToast(`File uploaded successfully: ${data.filename}`, 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addDataModal'));
            modal.hide();
            
            // Reset form
            document.getElementById('upload-form').reset();
            
            // Refresh layers
            loadLayers();
        } else {
            showToast(`Error: ${data.error}`, 'danger');
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Error uploading file:', error);
        showToast('Error uploading file', 'danger');
    });
}

// Add WMTS layer
function addWmtsLayer() {
    const url = document.getElementById('wmts-url').value;
    const layerName = document.getElementById('wmts-layer').value;
    
    if (!url) {
        showToast('Please enter a WMTS URL', 'warning');
        return;
    }
    
    showLoading();
    
    fetch('/api/wmts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: url,
            layer: layerName
        })
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        
        if (data.success) {
            showToast('WMTS layer added successfully', 'success');
            
            // Add layer to map
            try {
                const wmtsLayer = L.tileLayer(url, {
                    layers: layerName
                }).addTo(map);
                
                // Add to layers object
                const layerId = 'wmts_' + Date.now();
                layers[layerId] = wmtsLayer;
                
                // Add to UI
                addLayerToList({
                    id: layerId,
                    name: layerName || 'WMTS Layer',
                    type: 'wmts'
                });
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addWmtsModal'));
                modal.hide();
                
                // Reset form
                document.getElementById('wmts-form').reset();
            } catch (e) {
                console.error('Error adding WMTS layer:', e);
                showToast('Error adding WMTS layer: ' + e.message, 'danger');
            }
        } else {
            showToast(`Error: ${data.error}`, 'danger');
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Error adding WMTS layer:', error);
        showToast('Error adding WMTS layer', 'danger');
    });
}

// Show create layer modal
function showCreateLayerModal(type) {
    document.getElementById('layer-type').value = type;
    
    let title;
    switch (type) {
        case 'point':
            title = 'Create Point Layer';
            break;
        case 'line':
            title = 'Create Line Layer';
            break;
        case 'polygon':
            title = 'Create Polygon Layer';
            break;
        default:
            title = 'Create New Layer';
    }
    
    document.getElementById('createLayerTitle').textContent = title;
    
    // Reset fields
    const fieldsContainer = document.getElementById('fields-container');
    const fieldRows = fieldsContainer.querySelectorAll('.field-row:not(:first-child):not(:nth-child(2))');
    fieldRows.forEach(row => row.remove());
    
    const modal = new bootstrap.Modal(document.getElementById('createLayerModal'));
    modal.show();
}

// Add field to create layer form
function addFieldToForm() {
    const fieldsContainer = document.getElementById('fields-container');
    const fieldRow = document.createElement('div');
    fieldRow.className = 'field-row mb-2 d-flex';
    fieldRow.innerHTML = `
        <input type="text" class="form-control me-2 field-name" placeholder="Field name">
        <select class="form-select field-type">
            <option value="string">String</option>
            <option value="integer">Integer</option>
            <option value="float">Float</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
        </select>
        <button type="button" class="btn btn-outline-danger ms-2 btn-remove-field">-</button>
    `;
    
    fieldsContainer.appendChild(fieldRow);
    
    // Add event listener to remove button
    fieldRow.querySelector('.btn-remove-field').addEventListener('click', function() {
        fieldRow.remove();
    });
}

// Create new layer
function createNewLayer() {
    const name = document.getElementById('layer-name').value;
    const type = document.getElementById('layer-type').value;
    
    if (!name) {
        showToast('Please enter a layer name', 'warning');
        return;
    }
    
    // Get fields
    const fields = [];
    fields.push({ name: 'id', type: 'integer' });
    
    const fieldRows = document.querySelectorAll('.field-row:not(:first-child)');
    fieldRows.forEach(row => {
        const fieldName = row.querySelector('.field-name').value;
        const fieldType = row.querySelector('.field-type').value;
        
        if (fieldName) {
            fields.push({
                name: fieldName,
                type: fieldType
            });
        }
    });
    
    // Create layer
    const layerId = 'layer_' + Date.now();
    let layer;
    
    switch (type) {
        case 'point':
            layer = L.geoJSON(null, {
                pointToLayer: function(feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 8,
                        fillColor: "#ff7800",
                        color: "#000",
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    });
                },
                onEachFeature: onEachFeature
            }).addTo(map);
            break;
        case 'line':
            layer = L.geoJSON(null, {
                style: {
                    color: "#3388ff",
                    weight: 3,
                    opacity: 1
                },
                onEachFeature: onEachFeature
            }).addTo(map);
            break;
        case 'polygon':
            layer = L.geoJSON(null, {
                style: {
                    fillColor: "#3388ff",
                    weight: 2,
                    opacity: 1,
                    color: '#000',
                    fillOpacity: 0.5
                },
                onEachFeature: onEachFeature
            }).addTo(map);
            break;
    }
    
    // Store layer metadata
    layer.metadata = {
        name: name,
        type: type,
        fields: fields
    };
    
    // Add to layers object
    layers[layerId] = layer;
    
    // Add to UI
    addLayerToList({
        id: layerId,
        name: name,
        type: type
    });
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('createLayerModal'));
    modal.hide();
    
    // Reset form
    document.getElementById('create-layer-form').reset();
    
    // Select the new layer
    selectLayer(layerId);
    
    showToast(`Layer "${name}" created successfully`, 'success');
}

// Handle feature interaction
function onEachFeature(feature, layer) {
    layer.on({
        click: function(e) {
            if (editingMode === 'select') {
                selectFeature(layer);
                L.DomEvent.stopPropagation(e);
            } else if (editingMode === 'delete') {
                deleteFeature(layer);
                L.DomEvent.stopPropagation(e);
            }
        }
    });
}

// Select a feature
function selectFeature(layer) {
    // Unselect previous feature
    if (selectedFeature) {
        unselectFeature();
    }
    
    // Highlight selected feature
    selectedFeature = layer;
    const originalStyle = layer.options || layer.defaultOptions;
    layer._originalStyle = originalStyle;
    
    if (layer.setStyle) {
        layer.setStyle({
            color: '#ffcc00',
            weight: 4,
            opacity: 1
        });
    }
    
    // Show properties
    showFeatureProperties(layer);
    
    // Enable attribute editing
    document.getElementById('attribute-editor').style.display = 'block';
}

// Unselect feature
function unselectFeature() {
    if (!selectedFeature) return;
    
    // Restore original style
    if (selectedFeature.setStyle && selectedFeature._originalStyle) {
        selectedFeature.setStyle(selectedFeature._originalStyle);
    }
    
    // Clear properties
    document.getElementById('feature-properties').innerHTML = '<p class="text-muted">Select a feature to view properties</p>';
    
    // Hide attribute editing
    document.getElementById('attribute-editor').style.display = 'none';
    
    selectedFeature = null;
}

// Show feature properties
function showFeatureProperties(layer) {
    const propertiesDiv = document.getElementById('feature-properties');
    propertiesDiv.innerHTML = '';
    
    const feature = layer.feature;
    if (feature && feature.properties) {
        const table = document.createElement('table');
        table.className = 'table table-sm';
        table.innerHTML = '<thead><tr><th>Property</th><th>Value</th></tr></thead><tbody></tbody>';
        
        const tbody = table.querySelector('tbody');
        
        for (const key in feature.properties) {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${key}</td><td>${feature.properties[key]}</td>`;
            tbody.appendChild(row);
        }
        
        propertiesDiv.appendChild(table);
    } else {
        propertiesDiv.innerHTML = '<p class="text-muted">No properties available</p>';
    }
}

// Show edit attributes modal
function showEditAttributesModal() {
    if (!selectedFeature || !selectedFeature.feature) return;
    
    const form = document.getElementById('attributes-form');
    form.innerHTML = '';
    
    const feature = selectedFeature.feature;
    if (feature && feature.properties) {
        for (const key in feature.properties) {
            const formGroup = document.createElement('div');
            formGroup.className = 'mb-3';
            
            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = key;
            label.setAttribute('for', `attr-${key}`);
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control';
            input.id = `attr-${key}`;
            input.name = key;
            input.value = feature.properties[key] || '';
            
            formGroup.appendChild(label);
            formGroup.appendChild(input);
            form.appendChild(formGroup);
        }
    }
    
    const modal = new bootstrap.Modal(document.getElementById('editAttributesModal'));
    modal.show();
}

// Save attributes
function saveAttributes() {
    if (!selectedFeature || !selectedFeature.feature) return;
    
    const form = document.getElementById('attributes-form');
    const inputs = form.querySelectorAll('input');
    
    const feature = selectedFeature.feature;
    
    inputs.forEach(input => {
        const key = input.name;
        let value = input.value;
        
        // Try to convert to appropriate type
        if (!isNaN(value) && value !== '') {
            if (value.includes('.')) {
                value = parseFloat(value);
            } else {
                value = parseInt(value);
            }
        } else if (value.toLowerCase() === 'true') {
            value = true;
        } else if (value.toLowerCase() === 'false') {
            value = false;
        }
        
        feature.properties[key] = value;
    });
    
    // Update properties display
    showFeatureProperties(selectedFeature);
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editAttributesModal'));
    modal.hide();
    
    showToast('Attributes saved successfully', 'success');
}

// Show add field modal
function showAddFieldModal() {
    const modal = new bootstrap.Modal(document.getElementById('addFieldModal'));
    modal.show();
}

// Add field to feature
function addFieldToFeature() {
    if (!selectedFeature || !selectedFeature.feature) return;
    
    const fieldName = document.getElementById('new-field-name').value;
    const fieldType = document.getElementById('new-field-type').value;
    
    if (!fieldName) {
        showToast('Please enter a field name', 'warning');
        return;
    }
    
    const feature = selectedFeature.feature;
    
    // Initialize default value based on type
    let defaultValue;
    switch (fieldType) {
        case 'string':
            defaultValue = '';
            break;
        case 'integer':
            defaultValue = 0;
            break;
        case 'float':
            defaultValue = 0.0;
            break;
        case 'boolean':
            defaultValue = false;
            break;
        case 'date':
            defaultValue = new Date().toISOString().split('T')[0];
            break;
        default:
            defaultValue = null;
    }
    
    // Add field to feature properties
    feature.properties[fieldName] = defaultValue;
    
    // Update properties display
    showFeatureProperties(selectedFeature);
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addFieldModal'));
    modal.hide();
    
    // Reset form
    document.getElementById('add-field-form').reset();
    
    showToast(`Field "${fieldName}" added successfully`, 'success');
}

// Activate select tool
function activateSelectTool() {
    deactivateAllTools();
    editingMode = 'select';
    document.getElementById('tool-select').classList.add('editing-active');
    map.getContainer().style.cursor = 'pointer';
}

// Activate draw tool
function activateDrawTool() {
    if (!activeLayer) return;
    
    deactivateAllTools();
    editingMode = 'draw';
    document.getElementById('tool-draw').classList.add('editing-active');
    
    const layerType = activeLayer.metadata.type;
    
    // Enable drawing mode
    map.getContainer().style.cursor = 'crosshair';
    
    // Set up drawing based on layer type
    if (layerType === 'point') {
        map.once('click', function(e) {
            const feature = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [e.latlng.lng, e.latlng.lat]
                },
                properties: {
                    id: Date.now()
                }
            };
            
            // Add default properties based on layer fields
            if (activeLayer.metadata.fields) {
                activeLayer.metadata.fields.forEach(field => {
                    if (field.name !== 'id') {
                        let defaultValue;
                        switch (field.type) {
                            case 'string':
                                defaultValue = '';
                                break;
                            case 'integer':
                                defaultValue = 0;
                                break;
                            case 'float':
                                defaultValue = 0.0;
                                break;
                            case 'boolean':
                                defaultValue = false;
                                break;
                            case 'date':
                                defaultValue = new Date().toISOString().split('T')[0];
                                break;
                            default:
                                defaultValue = null;
                        }
                        feature.properties[field.name] = defaultValue;
                    }
                });
            }
            
            activeLayer.addData(feature);
            
            // Deactivate drawing mode
            deactivateAllTools();
            activateSelectTool();
            
            // Select the new feature
            const layers = activeLayer.getLayers();
            const newFeature = layers[layers.length - 1];
            selectFeature(newFeature);
        });
    } else if (layerType === 'line') {
        // For line drawing, we need to collect multiple points
        let points = [];
        let tempLine = null;
        
        function onClick(e) {
            points.push([e.latlng.lng, e.latlng.lat]);
            
            // Update temporary line
            if (tempLine) {
                map.removeLayer(tempLine);
            }
            
            if (points.length > 1) {
                tempLine = L.polyline(points.map(p => [p[1], p[0]]), {
                    color: '#ff7800',
                    weight: 3,
                    opacity: 0.7,
                    dashArray: '5, 10'
                }).addTo(map);
            }
        }
        
        function onDblClick(e) {
            // Remove temporary line
            if (tempLine) {
                map.removeLayer(tempLine);
            }
            
            // Remove event listeners
            map.off('click', onClick);
            map.off('dblclick', onDblClick);
            
            // Create feature if we have at least 2 points
            if (points.length >= 2) {
                const feature = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: points
                    },
                    properties: {
                        id: Date.now()
                    }
                };
                
                // Add default properties
                if (activeLayer.metadata.fields) {
                    activeLayer.metadata.fields.forEach(field => {
                        if (field.name !== 'id') {
                            let defaultValue;
                            switch (field.type) {
                                case 'string':
                                    defaultValue = '';
                                    break;
                                case 'integer':
                                    defaultValue = 0;
                                    break;
                                case 'float':
                                    defaultValue = 0.0;
                                    break;
                                case 'boolean':
                                    defaultValue = false;
                                    break;
                                case 'date':
                                    defaultValue = new Date().toISOString().split('T')[0];
                                    break;
                                default:
                                    defaultValue = null;
                            }
                            feature.properties[field.name] = defaultValue;
                        }
                    });
                }
                
                activeLayer.addData(feature);
                
                // Deactivate drawing mode
                deactivateAllTools();
                activateSelectTool();
                
                // Select the new feature
                const layers = activeLayer.getLayers();
                const newFeature = layers[layers.length - 1];
                selectFeature(newFeature);
            }
        }
        
        map.on('click', onClick);
        map.on('dblclick', onDblClick);
        
        showToast('Click to add points, double-click to finish', 'info');
    } else if (layerType === 'polygon') {
        // For polygon drawing, we need to collect multiple points
        let points = [];
        let tempPolygon = null;
        
        function onClick(e) {
            points.push([e.latlng.lng, e.latlng.lat]);
            
            // Update temporary polygon
            if (tempPolygon) {
                map.removeLayer(tempPolygon);
            }
            
            if (points.length > 2) {
                // Close the polygon
                const polygonPoints = [...points, points[0]];
                tempPolygon = L.polygon(polygonPoints.map(p => [p[1], p[0]]), {
                    color: '#ff7800',
                    weight: 2,
                    opacity: 0.7,
                    fillOpacity: 0.3,
                    dashArray: '5, 10'
                }).addTo(map);
            } else if (points.length > 1) {
                // Show line until we have enough points for a polygon
                tempPolygon = L.polyline(points.map(p => [p[1], p[0]]), {
                    color: '#ff7800',
                    weight: 2,
                    opacity: 0.7,
                    dashArray: '5, 10'
                }).addTo(map);
            }
        }
        
        function onDblClick(e) {
            // Remove temporary polygon
            if (tempPolygon) {
                map.removeLayer(tempPolygon);
            }
            
            // Remove event listeners
            map.off('click', onClick);
            map.off('dblclick', onDblClick);
            
            // Create feature if we have at least 3 points
            if (points.length >= 3) {
                // Close the polygon
                points.push(points[0]);
                
                const feature = {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [points]
                    },
                    properties: {
                        id: Date.now()
                    }
                };
                
                // Add default properties
                if (activeLayer.metadata.fields) {
                    activeLayer.metadata.fields.forEach(field => {
                        if (field.name !== 'id') {
                            let defaultValue;
                            switch (field.type) {
                                case 'string':
                                    defaultValue = '';
                                    break;
                                case 'integer':
                                    defaultValue = 0;
                                    break;
                                case 'float':
                                    defaultValue = 0.0;
                                    break;
                                case 'boolean':
                                    defaultValue = false;
                                    break;
                                case 'date':
                                    defaultValue = new Date().toISOString().split('T')[0];
                                    break;
                                default:
                                    defaultValue = null;
                            }
                            feature.properties[field.name] = defaultValue;
                        }
                    });
                }
                
                activeLayer.addData(feature);
                
                // Deactivate drawing mode
                deactivateAllTools();
                activateSelectTool();
                
                // Select the new feature
                const layers = activeLayer.getLayers();
                const newFeature = layers[layers.length - 1];
                selectFeature(newFeature);
            }
        }
        
        map.on('click', onClick);
        map.on('dblclick', onDblClick);
        
        showToast('Click to add points, double-click to finish', 'info');
    }
}

// Activate edit tool
function activateEditTool() {
    if (!selectedFeature) {
        showToast('Please select a feature to edit', 'warning');
        return;
    }
    
    deactivateAllTools();
    editingMode = 'edit';
    document.getElementById('tool-edit').classList.add('editing-active');
    
    // This is a simplified version - in a real app, you would use a library like Leaflet.Editable
    // or Leaflet.Draw for proper geometry editing
    showToast('Geometry editing not implemented in this demo', 'info');
    
    // Deactivate edit mode after showing the message
    setTimeout(() => {
        deactivateAllTools();
        activateSelectTool();
    }, 2000);
}

// Activate delete tool
function activateDeleteTool() {
    deactivateAllTools();
    editingMode = 'delete';
    document.getElementById('tool-delete').classList.add('editing-active');
    map.getContainer().style.cursor = 'crosshair';
    
    showToast('Click on a feature to delete it', 'info');
}

// Delete feature
function deleteFeature(layer) {
    if (confirm('Are you sure you want to delete this feature?')) {
        if (selectedFeature === layer) {
            selectedFeature = null;
            document.getElementById('feature-properties').innerHTML = '<p class="text-muted">Select a feature to view properties</p>';
            document.getElementById('attribute-editor').style.display = 'none';
        }
        
        activeLayer.removeLayer(layer);
        
        showToast('Feature deleted', 'success');
        
        // Deactivate delete mode
        deactivateAllTools();
        activateSelectTool();
    }
}

// Deactivate all tools
function deactivateAllTools() {
    editingMode = null;
    
    // Remove active class from all tools
    const tools = document.querySelectorAll('#editing-tools button');
    tools.forEach(tool => {
        tool.classList.remove('editing-active');
    });
    
    // Reset cursor
    map.getContainer().style.cursor = '';
    
    // Remove event listeners
    map.off('click');
    map.off('dblclick');
    
    // Remove temporary drawing layers
    if (drawingLayer) {
        map.removeLayer(drawingLayer);
        drawingLayer = null;
    }
}

// Show loading indicator
function showLoading() {
    const loading = document.createElement('div');
    loading.className = 'loading-indicator';
    loading.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loading);
}

// Hide loading indicator
function hideLoading() {
    const loading = document.querySelector('.loading-indicator');
    if (loading) {
        loading.remove();
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Initialize and show toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}
