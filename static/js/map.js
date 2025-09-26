// Map management and visualization
let map;
let currentLayer;
let currentCropData = {};
let currentCropName = '';
let cropMinMax = { min: 0, max: 1000 };
let currentStateFilter = null;
let allMunicipalitiesData = null;
let radiusMode = false;
let radiusCircle = null;
let radiusCenter = null;
let radiusKm = 50;

// Map layers
let baseLayers = {};
let currentBaseLayer = 'osm';
let mapOpacity = 1.0;

function initializeMap() {
    // Initialize map centered on Brazil
    map = L.map('map', {
        zoomControl: false // We'll add custom controls
    }).setView([-14.2350, -51.9253], 5);

    // Make map globally accessible
    window.map = map;

    // Define base layers
    baseLayers = {
        'osm': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            className: 'grayscale-tiles'
        }),
        'satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles © Esri',
            maxZoom: 18
        }),
        'terrain': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap',
            maxZoom: 17
        }),
        'dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors, © CARTO',
            maxZoom: 18
        }),
        'light': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors, © CARTO',
            maxZoom: 18
        })
    };

    // Add default layer
    baseLayers[currentBaseLayer].addTo(map);

    // Add custom zoom control
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Add scale control
    L.control.scale({
        position: 'bottomleft',
        metric: true,
        imperial: false
    }).addTo(map);

    // Add fullscreen control
    addFullscreenControl();

    // Add base layer control
    addBaseLayerControl();

    // Add map tools control
    addMapToolsControl();

    // Set more reasonable bounds for Brazil
    const brazilBounds = [
        [-33.75, -73.99],  // Southwest
        [5.27, -28.84]     // Northeast  
    ];

    // Don't restrict bounds too strictly initially
    map.setMinZoom(4);
    map.setMaxZoom(18);

    // Fit to Brazil bounds initially with padding
    map.fitBounds(brazilBounds, {
        padding: [50, 50]
    });

    // Setup radius mode click handler
    map.on('click', function(e) {
        if (radiusMode) {
            setRadiusCenter(e.latlng);
        }
    });

    // Add coordinates display on mouse move
    map.on('mousemove', function(e) {
        updateCoordinatesDisplay(e.latlng);
    });

    console.log('Map initialized successfully with bounds:', brazilBounds);
}

function addFullscreenControl() {
    const fullscreenControl = L.control({ position: 'topright' });

    fullscreenControl.onAdd = function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.style.backgroundColor = 'white';
        container.style.width = '30px';
        container.style.height = '30px';
        container.style.cursor = 'pointer';
        container.title = 'Tela cheia';

        container.innerHTML = '<i class="fas fa-expand" style="line-height: 30px; text-align: center; display: block;"></i>';

        container.onclick = function() {
            toggleFullscreen();
        };

        return container;
    };

    fullscreenControl.addTo(map);
}

function addBaseLayerControl() {
    const layerControl = L.control({ position: 'topright' });

    layerControl.onAdd = function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control map-layer-control');
        container.style.backgroundColor = 'white';
        container.style.padding = '10px';
        container.style.minWidth = '150px';
        container.style.display = 'none';

        container.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px;">
                <i class="fas fa-layer-group"></i> Camadas Base
            </div>
            <div class="layer-options">
                <label style="display: block; margin-bottom: 5px; cursor: pointer;">
                    <input type="radio" name="baseLayer" value="osm" checked> 
                    <span style="margin-left: 5px;">Mapa Padrão</span>
                </label>
                <label style="display: block; margin-bottom: 5px; cursor: pointer;">
                    <input type="radio" name="baseLayer" value="satellite"> 
                    <span style="margin-left: 5px;">Satélite</span>
                </label>
                <label style="display: block; margin-bottom: 5px; cursor: pointer;">
                    <input type="radio" name="baseLayer" value="terrain"> 
                    <span style="margin-left: 5px;">Terreno</span>
                </label>
                <label style="display: block; margin-bottom: 5px; cursor: pointer;">
                    <input type="radio" name="baseLayer" value="dark"> 
                    <span style="margin-left: 5px;">Escuro</span>
                </label>
                <label style="display: block; margin-bottom: 5px; cursor: pointer;">
                    <input type="radio" name="baseLayer" value="light"> 
                    <span style="margin-left: 5px;">Claro</span>
                </label>
            </div>
        `;

        // Add event listeners for radio buttons
        const radioButtons = container.querySelectorAll('input[name="baseLayer"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    changeBaseLayer(this.value);
                }
            });
        });

        return container;
    };

    layerControl.addTo(map);

    // Add toggle button
    const toggleButton = L.control({ position: 'topright' });
    toggleButton.onAdd = function(map) {
        const button = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        button.style.backgroundColor = 'white';
        button.style.width = '30px';
        button.style.height = '30px';
        button.style.cursor = 'pointer';
        button.title = 'Alterar camada base';

        button.innerHTML = '<i class="fas fa-map" style="line-height: 30px; text-align: center; display: block;"></i>';

        button.onclick = function() {
            const panel = document.querySelector('.map-layer-control');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        };

        return button;
    };

    toggleButton.addTo(map);
}

function addMapToolsControl() {
    const toolsControl = L.control({ position: 'topright' });

    toolsControl.onAdd = function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control map-tools-control');
        container.style.backgroundColor = 'white';
        container.style.padding = '10px';
        container.style.minWidth = '200px';
        container.style.display = 'none';

        container.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px;">
                <i class="fas fa-tools"></i> Ferramentas do Mapa
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 12px;">
                    <i class="fas fa-adjust"></i> Opacidade das Camadas
                </label>
                <input type="range" id="opacity-slider" min="0" max="100" value="100" 
                       style="width: 100%; margin-bottom: 5px;">
                <div style="font-size: 10px; color: #666;">
                    <span id="opacity-value">100%</span>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <button id="reset-view-btn" class="btn btn-sm btn-outline-primary" style="width: 100%; margin-bottom: 5px;">
                    <i class="fas fa-home"></i> Resetar Visualização
                </button>
                <button id="my-location-btn" class="btn btn-sm btn-outline-success" style="width: 100%; margin-bottom: 5px;">
                    <i class="fas fa-location-arrow"></i> Minha Localização
                </button>
                <button id="measure-distance-btn" class="btn btn-sm btn-outline-info" style="width: 100%; margin-bottom: 5px;">
                    <i class="fas fa-ruler"></i> Medir Distância
                </button>
                
            </div>

            <div style="margin-bottom: 10px;">
                <div style="font-size: 11px; color: #666; margin-bottom: 3px;">
                    <i class="fas fa-mouse-pointer"></i> Coordenadas:
                </div>
                <div id="coordinates-display" style="font-size: 10px; font-family: monospace; background: #f5f5f5; padding: 3px; border-radius: 3px;">
                    --, --
                </div>
            </div>
        `;

        // Add event listeners
        const opacitySlider = container.querySelector('#opacity-slider');
        const opacityValue = container.querySelector('#opacity-value');
        const resetViewBtn = container.querySelector('#reset-view-btn');
        const myLocationBtn = container.querySelector('#my-location-btn');
        const measureBtn = container.querySelector('#measure-distance-btn');
        opacitySlider.addEventListener('input', function() {
            const opacity = this.value / 100;
            opacityValue.textContent = this.value + '%';
            updateLayersOpacity(opacity);
        });

        resetViewBtn.addEventListener('click', resetMapView);
        myLocationBtn.addEventListener('click', goToMyLocation);
        measureBtn.addEventListener('click', toggleMeasureMode);

        return container;
    };

    toolsControl.addTo(map);

    // Add toggle button
    const toggleButton = L.control({ position: 'topright' });
    toggleButton.onAdd = function(map) {
        const button = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        button.style.backgroundColor = 'white';
        button.style.width = '30px';
        button.style.height = '30px';
        button.style.cursor = 'pointer';
        button.title = 'Ferramentas do mapa';

        button.innerHTML = '<i class="fas fa-tools" style="line-height: 30px; text-align: center; display: block;"></i>';

        button.onclick = function() {
            const panel = document.querySelector('.map-tools-control');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        };

        return button;
    };

    toggleButton.addTo(map);

    // Add separate revendas control
    addRevendasControl();

    // Add separate vendedores control
    addVendedoresControl();
}

function addRevendasControl() {
    const revendasControl = L.control({ position: 'topright' });

    revendasControl.onAdd = function(map) {
        const button = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        button.style.backgroundColor = 'white';
        button.style.width = '30px';
        button.style.height = '30px';
        button.style.cursor = 'pointer';
        button.title = 'Territórios de Revendas';

        button.innerHTML = '<i class="fas fa-store" style="line-height: 30px; text-align: center; display: block; color: #FF5722;"></i>';

        button.onclick = function() {
            toggleRevendasPanel();
        };

        return button;
    };

    revendasControl.addTo(map);
}

function addVendedoresControl() {
    const vendedoresControl = L.control({ position: 'topright' });

    vendedoresControl.onAdd = function(map) {
        const button = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        button.style.backgroundColor = 'white';
        button.style.width = '30px';
        button.style.height = '30px';
        button.style.cursor = 'pointer';
        button.title = 'Territórios de Vendedores';

        button.innerHTML = '<i class="fas fa-user-tie" style="line-height: 30px; text-align: center; display: block; color: #2196F3;"></i>';

        button.onclick = function() {
            toggleVendedoresPanel();
        };

        return button;
    };

    vendedoresControl.addTo(map);
}

function changeBaseLayer(layerType) {
    // Remove current base layer
    map.eachLayer(function(layer) {
        if (layer instanceof L.TileLayer) {
            map.removeLayer(layer);
        }
    });

    // Add new base layer
    currentBaseLayer = layerType;
    baseLayers[layerType].addTo(map);

    console.log(`Base layer changed to: ${layerType}`);
}

function updateLayersOpacity(opacity) {
    mapOpacity = opacity;

    // Atualiza a opacidade para todas as camadas ativas
    if (window.activeLayers) {
        window.activeLayers.forEach(layer => {
            if (layer.mapLayer) {
                // VERIFICAÇÃO ADICIONADA:
                // Só aplica opacidade de PREENCHIMENTO se a camada não for de revenda.
                // Para revendas, queremos que o preenchimento seja sempre 0.
                if (layer.type !== 'revendas') {
                    layer.mapLayer.setStyle({
                        fillOpacity: opacity * 0.7, // Opacidade do preenchimento
                        opacity: opacity // Opacidade da borda
                    });
                } else {
                    // Para revendas, mude apenas a opacidade da BORDA
                    layer.mapLayer.setStyle({
                        opacity: opacity
                    });
                }
            }
        });
    }

    // Se houver uma camada 'currentLayer' (sistema antigo), aplica a mesma lógica
    if (currentLayer && currentLayer.options.type !== 'revendas') {
         currentLayer.setStyle({ fillOpacity: opacity * 0.7, opacity: opacity });
    }
}

function resetMapView() {
    const brazilBounds = [
        [-33.75, -73.99],  // Southwest
        [5.27, -28.84]     // Northeast  
    ];

    map.fitBounds(brazilBounds, {
        padding: [50, 50]
    });
}

function goToMyLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            map.setView([lat, lng], 12);

            // Add temporary marker
            const marker = L.marker([lat, lng])
                .addTo(map)
                .bindPopup('Sua localização')
                .openPopup();

            // Remove marker after 5 seconds
            setTimeout(() => {
                map.removeLayer(marker);
            }, 5000);

        }, function(error) {
            alert('Não foi possível obter sua localização: ' + error.message);
        });
    } else {
        alert('Geolocalização não é suportada pelo seu navegador');
    }
}

let measureMode = false;
let measureLine = null;
let measureMarkers = [];

// Revendas control
let revendasPanel = null;
let currentRevendaLayer = null;
let revendasData = [];
let revendaLayers = []; // Array para armazenar múltiplas revendas selecionadas
let selectedRevendas = []; // Array para revendas selecionadas no painel

// Vendedores control
let vendedoresPanel = null;
let currentVendedorLayer = null;
let vendedoresData = [];
let selectedVendedores = [];

function toggleMeasureMode() {
    measureMode = !measureMode;
    const btn = document.querySelector('#measure-distance-btn');

    if (measureMode) {
        btn.classList.remove('btn-outline-info');
        btn.classList.add('btn-info');
        btn.innerHTML = '<i class="fas fa-times"></i> Cancelar Medição';
        map.getContainer().style.cursor = 'crosshair';

        // Clear previous measurements
        clearMeasurements();

        // Add click handler for measuring
        map.on('click', handleMeasureClick);
    } else {
        btn.classList.remove('btn-info');
        btn.classList.add('btn-outline-info');
        btn.innerHTML = '<i class="fas fa-ruler"></i> Medir Distância';
        map.getContainer().style.cursor = '';

        map.off('click', handleMeasureClick);
        clearMeasurements();
    }
}

function handleMeasureClick(e) {
    measureMarkers.push(e.latlng);

    // Add marker
    const marker = L.marker(e.latlng)
        .addTo(map)
        .bindPopup(`Ponto ${measureMarkers.length}: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);

    if (measureMarkers.length >= 2) {
        // Calculate distance
        const distance = calculateDistance(
            measureMarkers[0].lat, measureMarkers[0].lng,
            measureMarkers[1].lat, measureMarkers[1].lng
        );

        // Draw line
        measureLine = L.polyline(measureMarkers, {
            color: 'red',
            weight: 3,
            opacity: 0.8
        }).addTo(map);

        // Add distance popup
        const midpoint = [
            (measureMarkers[0].lat + measureMarkers[1].lat) / 2,
            (measureMarkers[0].lng + measureMarkers[1].lng) / 2
        ];

        L.popup()
            .setLatLng(midpoint)
            .setContent(`<strong>Distância:</strong><br>${distance.toFixed(2)} km`)
            .openOn(map);

        // Reset for next measurement
        measureMarkers = [];
    }
}

function clearMeasurements() {
    if (measureLine) {
        map.removeLayer(measureLine);
        measureLine = null;
    }

    measureMarkers = [];

    // Remove measure markers
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker && layer.getPopup() && 
            layer.getPopup().getContent().includes('Ponto ')) {
            map.removeLayer(layer);
        }
    });
}

function updateCoordinatesDisplay(latlng) {
    const coordsDisplay = document.querySelector('#coordinates-display');
    if (coordsDisplay) {
        coordsDisplay.textContent = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
    }
}

function toggleFullscreen() {
    const mapContainer = document.getElementById('map');

    if (!document.fullscreenElement) {
        mapContainer.requestFullscreen().then(() => {
            // Resize map after entering fullscreen
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }).catch(err => {
            console.error('Error entering fullscreen:', err);
        });
    } else {
        document.exitFullscreen().then(() => {
            // Resize map after exiting fullscreen
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        });
    }
}

function loadCropLayer(cropName) {
    console.log(`Loading crop layer for: ${cropName}`);

    // Show loading state - check if button exists
    const loadBtn = document.getElementById('load-layer-btn');
    let originalText = '';
    if (loadBtn) {
        originalText = loadBtn.innerHTML;
        loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Carregando...';
        loadBtn.disabled = true;
    }

    // Fetch crop data
    fetch(`/api/crop-data/${encodeURIComponent(cropName)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                currentCropData = data.data;
                currentCropName = cropName;

                // Calculate min/max for this specific crop
                const values = Object.values(currentCropData)
                    .map(item => item.harvested_area)
                    .filter(value => value > 0);

                if (values.length > 0) {
                    cropMinMax.min = Math.min(...values);
                    cropMinMax.max = Math.max(...values);
                } else {
                    cropMinMax = { min: 0, max: 1000 };
                }

                loadMunicipalityBoundaries(cropName);
            } else {
                console.error('Error loading crop data:', data.error);
                alert('Erro ao carregar dados da cultura: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Network error:', error);
            if (error.message.includes('502')) {
                alert('Servidor temporariamente indisponível. Tente novamente em alguns segundos.');
            } else if (error.message.includes('Unexpected token')) {
                alert('Resposta inválida do servidor. Verifique se o servidor está funcionando corretamente.');
            } else {
                alert('Erro de conexão ao carregar dados da cultura: ' + error.message);
            }
        })
        .finally(() => {
            if (loadBtn) {
                loadBtn.innerHTML = originalText;
                loadBtn.disabled = false;
            }
        });
}

function loadMunicipalityBoundaries(cropName) {
    // Remove existing layer
    if (currentLayer) {
        map.removeLayer(currentLayer);
    }

    // Try to load the most complete GeoJSON file available
    const geoJsonFiles = [
        '/static/data/brazil_municipalities_all.geojson',
        '/attached_assets/brazil_municipalities_all_1752980285489.geojson',
        '/static/data/brazil_municipalities_combined.geojson',
        '/static/data/br_municipalities_simplified.geojson'
    ];

    let fileLoaded = false;

    async function tryLoadGeoJSON() {
        for (const filePath of geoJsonFiles) {
            try {
                console.log(`Tentando carregar: ${filePath}`);
                const response = await fetch(filePath);
                if (response.ok) {
                    const geoData = await response.json();
                    console.log(`GeoJSON carregado com sucesso: ${filePath}, ${geoData.features.length} municípios`);

                    // Store all municipalities data
                    allMunicipalitiesData = geoData;

                    // Apply state filter if one is selected
                    const filteredData = applyStateFilter(geoData);

                    currentLayer = L.geoJSON(filteredData, {
                        style: function(feature) {
                            return getFeatureStyle(feature, cropName);
                        },
                        onEachFeature: function(feature, layer) {
                            setupFeaturePopup(feature, layer, cropName);
                        }
                    }).addTo(map);

                    // Fit map to layer bounds (focused on filtered state if applicable)
                    if (currentLayer.getBounds().isValid()) {
                        map.fitBounds(currentLayer.getBounds());
                    }

                    // Update legend
                    updateMapLegend(cropName);
                    fileLoaded = true;
                    break;
                }
            } catch (error) {
                console.log(`Erro ao carregar ${filePath}:`, error);
                continue;
            }
        }

        if (!fileLoaded) {
            console.error('Nenhum arquivo GeoJSON pôde ser carregado');
            createFallbackVisualization(cropName);
        }
    }

    tryLoadGeoJSON();
}

function createFallbackVisualization(cropName) {
    console.log('Creating fallback visualization for:', cropName);

    // Create sample markers for demonstration when GeoJSON is not available
    const sampleCities = [
        { name: "São Paulo", lat: -23.5505, lng: -46.6333, state: "SP" },
        { name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729, state: "RJ" },
        { name: "Brasília", lat: -15.7942, lng: -47.8822, state: "DF" },
        { name: "Salvador", lat: -12.9714, lng: -38.5014, state: "BA" },
        { name: "Fortaleza", lat: -3.7172, lng: -38.5433, state: "CE" },
        { name: "Belo Horizonte", lat: -19.9167, lng: -43.9345, state: "MG" },
        { name: "Curitiba", lat: -25.4244, lng: -49.2654, state: "PR" },
        { name: "Porto Alegre", lat: -30.0346, lng: -51.2177, state: "RS" },
        { name: "Manaus", lat: -3.1190, lng: -60.0217, state: "AM" },
        { name: "Belém", lat: -1.4558, lng: -48.5044, state: "PA" },
        { name: "Goiânia", lat: -16.6869, lng: -49.2648, state: "GO" },
        { name: "Recife", lat: -8.0476, lng: -34.8770, state: "PE" }
    ];

    currentLayer = L.layerGroup();

    sampleCities.forEach((city, index) => {
        const area = (index + 1) * 10000 + Math.random() * 30000; // Varied area for demonstration
        const color = getColorForValue(area, 10000, 150000);

        const marker = L.circleMarker([city.lat, city.lng], {
            radius: Math.max(8, Math.sqrt(area / 5000)),
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });

        marker.bindPopup(`
            <strong>${city.name} (${city.state})</strong><br>
            Cultura: ${cropName}<br>
            Área Colhida: ${area.toLocaleString('pt-BR', {maximumFractionDigits: 0})} hectares<br>
            <em>Dados de demonstração</em>
        `);

        currentLayer.addLayer(marker);
    });

    currentLayer.addTo(map);

    // Set appropriate bounds
    cropMinMax = { min: 10000, max: 150000 };

    // Update legend
    updateMapLegend(cropName);

    console.log('Fallback visualization created with', sampleCities.length, 'cities');
}

function getFeatureStyle(feature, cropName) {
    // Try multiple ways to get municipality code from GeoJSON
    const municipalityCode = feature.properties.GEOCODIGO || 
                           feature.properties.CD_MUN || 
                           feature.properties.cd_geocmu || 
                           feature.properties.geocodigo ||
                           feature.properties.CD_GEOCMU;

    const cropData = currentCropData[municipalityCode];

    if (!cropData || !cropData.harvested_area || cropData.harvested_area === 0) {
        // Municípios sem dados - cor cinza claro
        return {
            fillColor: '#E8E8E8',
            weight: 0.3,
            opacity: 0.8,
            color: '#CCCCCC',
            fillOpacity: 0.6 * mapOpacity
        };
    }

    const area = cropData.harvested_area;
    const color = getColorForValue(area, cropMinMax.min, cropMinMax.max);

    return {
        fillColor: color,
        weight: 0.3,
        opacity: 0.8,
        color: '#666666',
        fillOpacity: 0.7 * mapOpacity
    };
}

function setupFeaturePopup(feature, layer, cropName) {
    // Try multiple ways to get municipality info from GeoJSON
    const municipalityCode = feature.properties.GEOCODIGO || feature.properties.CD_MUN || feature.properties.cd_geocmu || feature.properties.geocodigo;
    const municipalityName = feature.properties.NOME || feature.properties.NM_MUN || feature.properties.nm_mun || feature.properties.nome || 'Nome não disponível';
    const stateUF = feature.properties.UF || feature.properties.SIGLA_UF || feature.properties.uf;
    const cropData = currentCropData[municipalityCode];

    let popupContent = `<strong>${municipalityName}</strong>`;
    if (stateUF) {
        popupContent += ` (${stateUF})`;
    }
    popupContent += `<br>`;

    if (cropData && cropData.harvested_area) {
        popupContent += `
            Cultura: ${cropName}<br>
            Área Colhida: ${cropData.harvested_area.toLocaleString('pt-BR')} hectares<br>
            Código: ${municipalityCode}
        `;
    } else {
        popupContent += `
            Cultura: ${cropName}<br>
            <em>Dados não disponíveis</em><br>
            Código: ${municipalityCode || 'N/A'}
        `;
    }

    layer.bindPopup(popupContent);
}

function getMinMaxValues() {
    return cropMinMax;
}

function getColorForValue(value, min, max) {
    // Obter cor base selecionada
    const selectedColor = document.getElementById('color-selector')?.value || '#4CAF50';
    // Se valor é 0 ou negativo, mas queremos cor de 1ha, usar 1
    if (value <= 0) value = 1;

    // Ajustar os valores mínimo e máximo para melhor distribuição
    const adjustedMin = Math.max(min, 1);
    const adjustedMax = Math.max(max, adjustedMin * 10);

    // Use escala logarítmica para melhor distribuição
    const logMin = Math.log(adjustedMin);
    const logMax = Math.log(adjustedMax);
    const logValue = Math.log(Math.max(value, adjustedMin));
    const normalized = (logValue - logMin) / (logMax - logMin);

    // Gerar cor sequencial baseada na cor selecionada
    return generateSequentialColor(normalized, selectedColor);
}

function generateSequentialColor(normalized, baseColor) {
    // Converter hex para RGB
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    // Converter RGB para HSL
    const rgbToHsl = (r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    };

    // Converter HSL para RGB
    const hslToRgb = (h, s, l) => {
        h /= 360; s /= 100; l /= 100;
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    };

    const baseRgb = hexToRgb(baseColor);
    if (!baseRgb) return baseColor;

    const baseHsl = rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);

    // Criar escala sequencial: valores maiores = cores mais escuras
    // Luminosidade varia de 85% (claro) para 15% (escuro)
    const lightness = 85 - (normalized * 70);

    // Manter matiz, ajustar levemente a saturação
    const saturation = Math.max(20, baseHsl.s - (normalized * 10));

    const newRgb = hslToRgb(baseHsl.h, saturation, lightness);
    return `#${((1 << 24) + (newRgb.r << 16) + (newRgb.g << 8) + newRgb.b).toString(16).slice(1)}`;
}

function updateMapLegend(cropName, filteredCount = null) {
    // Remove existing legend
    if (window.currentLegendControl) {
        map.removeControl(window.currentLegendControl);
        window.currentLegendControl = null;
    }

    const { min, max } = cropMinMax;

    // Ajustar valores para melhor visualização
    const adjustedMin = Math.max(min, 1);
    const adjustedMax = Math.max(max, adjustedMin * 10);

    window.currentLegendControl = L.control({ position: 'bottomright' });
    window.currentLegendControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'map-legend');

        let legendHTML = `<h6><i class="fas fa-seedling"></i> ${cropName}</h6>`;
        if (radiusCenter && filteredCount !== null) {
            legendHTML += `<div style="font-size: 10px; margin-bottom: 8px; color: #FF4444; font-weight: 600;">
                <i class="fas fa-map-marker-alt"></i> Raio: ${radiusKm}km (${filteredCount} municípios)
            </div>`;
        }
        legendHTML += `<div style="font-size: 11px; margin-bottom: 5px;">Hectares Colhidos</div>`;

        // Create color scale com distribuição logarítmica usando cor selecionada
        const selectedColor = document.getElementById('color-selector')?.value || '#4CAF50';
        const steps = 6;
        for (let i = 0; i < steps; i++) {
            let value;
            if (i === 0) {
                value = adjustedMin;
            } else if (i === steps - 1) {
                value = adjustedMax;
            } else {
                // Distribuição logarítmica
                const logMin = Math.log(adjustedMin);
                const logMax = Math.log(adjustedMax);
                const logValue = logMin + (logMax - logMin) * (i / (steps - 1));
                value = Math.exp(logValue);
            }

            const color = getColorForValue(value, adjustedMin, adjustedMax);
            const displayValue = value < 1000 ? 
                value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) :
                (value / 1000).toLocaleString('pt-BR', {maximumFractionDigits: 1}) + 'k';

            legendHTML += `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${color}; width: 18px; height: 18px; display: inline-block; margin-right: 5px; border: 1px solid #ccc;"></div>
                    <span style="font-size: 10px;">${displayValue} ha</span>
                </div>
            `;
        }

        legendHTML += `
            <div class="legend-item mt-2" style="font-size: 10px; color: #666;">
                <div class="legend-color" style="background-color: #F5F5F5; width: 18px; height: 18px; display: inline-block; margin-right: 5px; border: 1px solid #ccc;"></div>
                <span style="font-size: 10px;">Sem dados</span>
            </div>
        `;

        div.innerHTML = legendHTML;
        return div;
    };
    window.currentLegendControl.addTo(map);

    console.log(`Legend updated for ${cropName}: ${adjustedMin.toLocaleString()} - ${adjustedMax.toLocaleString()} ha`);
}

// Data is now static, no processing needed
function processData() {
    showStatus('Dados já estão carregados estaticamente!', 'info');
}

function createGeoJSONVisualization(cropData, cropName) {
    // Clear existing layers
    if (currentLayer) {
        map.removeLayer(currentLayer);
    }

    // Create color scale based on data
    const values = Object.values(cropData).map(d => d.harvested_area);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // Update legend
    updateLegend(cropName, minValue, maxValue);

    // Create markers for municipalities with data
    const markers = [];
    for (const [municipalityCode, data] of Object.entries(cropData)) {
        // Use approximate coordinates (this would need a proper geocoding service)
        const lat = -15 + (Math.random() - 0.5) * 20; // Random lat between -25 and -5
        const lng = -50 + (Math.random() - 0.5) * 30; // Random lng between -65 and -35

        const color = getColorForValue(data.harvested_area, minValue, maxValue);

        const marker = L.circleMarker([lat, lng], {
            radius: Math.sqrt(data.harvested_area / maxValue) * 20 + 5,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).bindPopup(`
            <strong>${data.municipality_name} (${data.state_code})</strong><br>
            Cultura: ${cropName}<br>
            Área Colhida: ${data.harvested_area.toLocaleString()} hectares
        `);

        markers.push(marker);
    }

    currentLayer = L.layerGroup(markers).addTo(map);
    console.log('Fallback visualization created');
}

function updateLegend(cropName, minValue, maxValue) {
    const legendElement = document.getElementById('legend');
    if (!legendElement) {
        console.warn('Legend element not found - this is expected as we use map legend control instead');
        return;
    }

    try {
        legendElement.innerHTML = `
            <h4>${cropName}</h4>
            <div class="legend-scale">
                <div class="legend-labels">
                    <span class="legend-min">${minValue.toLocaleString()} ha</span>
                    <span class="legend-max">${maxValue.toLocaleString()} ha</span>
                </div>
                <div class="legend-gradient"></div>
            </div>
        `;
        console.log(`Legend updated for ${cropName}: ${minValue} - ${maxValue} ha`);
    } catch (error) {
        console.warn('Error updating legend:', error);
    }
}


function applyStateFilter(geoData, layerState = null) {
    // Se não há filtro de estado definido, retornar todos os dados
    const stateFilter = layerState || currentStateFilter;
    if (!stateFilter) {
        return geoData;
    }

    const filteredFeatures = geoData.features.filter(feature => {
        const stateUF = feature.properties.UF || feature.properties.SIGLA_UF || feature.properties.uf;
        return stateUF === stateFilter;
    });

    return {
        type: "FeatureCollection",
        features: filteredFeatures
    };
}

function applyStateFilterForLayer(geoData, layerState) {
    // Para camadas específicas, usar o estado da camada se definido
    return applyStateFilter(geoData, layerState);
}

function filterByStateOnMap(stateCode) {
    currentStateFilter = stateCode;

    // If we have loaded data and a crop is selected, reload the layer with the filter
    if (allMunicipalitiesData && currentCropName) {
        // Remove existing layer
        if (currentLayer) {
            map.removeLayer(currentLayer);
        }

        // Apply state filter
        const filteredData = applyStateFilter(allMunicipalitiesData);

        // Create new layer with filtered data
        currentLayer = L.geoJSON(filteredData, {
            style: function(feature) {
                return getFeatureStyle(feature, currentCropName);
            },
            onEachFeature: function(feature, layer) {
                setupFeaturePopup(feature, layer, currentCropName);
            }
        }).addTo(map);

        // Fit map to layer bounds (focused on filtered state if applicable)
        if (currentLayer.getBounds().isValid()) {
            map.fitBounds(currentLayer.getBounds());
        } else if (!stateCode) {
            // If no state filter, reset to Brazil bounds
            const brazilBounds = [
                [-33.7683777809, -73.98283055299],  // Southwest
                [5.2842873834, -28.84765906699]     // Northeast  
            ];
            map.fitBounds(brazilBounds);
        }

        // Update legend
        updateMapLegend(currentCropName);
    }
}

function toggleRadiusMode() {
    radiusMode = !radiusMode;
    const toggleBtn = document.getElementById('radius-toggle');
    const radiusInfo = document.getElementById('radius-info');

    if (radiusMode) {
        toggleBtn.classList.remove('btn-outline-success');
        toggleBtn.classList.add('btn-success');
        toggleBtn.innerHTML = '<i class="fas fa-times"></i>';
        radiusInfo.style.display = 'block';
        map.getContainer().style.cursor = 'crosshair';
    } else {
        toggleBtn.classList.remove('btn-success');
        toggleBtn.classList.add('btn-outline-success');
        toggleBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
        radiusInfo.style.display = 'none';
        map.getContainer().style.cursor = '';
    }
}

function setRadiusCenter(latlng) {
    radiusCenter = latlng;
    radiusKm = parseInt(document.getElementById('radius-input').value) || 50;

    // Remove existing circle
    if (radiusCircle) {
        map.removeLayer(radiusCircle);
    }

    // Create new circle
    radiusCircle = L.circle(latlng, {
        color: '#FF4444',
        fillColor: '#FF4444',
        fillOpacity: 0.2,
        radius: radiusKm * 1000 // Convert km to meters
    }).addTo(map);

    // Add popup to center
    const centerMarker = L.marker(latlng, {
        icon: L.divIcon({
            className: 'radius-center-marker',
            html: '<div style="background: #FF4444; border: 2px solid white; border-radius: 50%; width: 12px; height: 12px;"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        })
    }).addTo(map);

    centerMarker.bindPopup(`
        <strong>Centro do Raio</strong><br>
        Raio: ${radiusKm} km<br>
        Lat: ${latlng.lat.toFixed(4)}<br>
        Lng: ${latlng.lng.toFixed(4)}
    `);

    // Show clear button
    document.getElementById('clear-radius').style.display = 'block';

    // Exit radius mode
    toggleRadiusMode();

    // Filter data if crop is selected
    const selectedCrop = document.getElementById('crop-selector').value;
    if (selectedCrop) {
        filterByRadius(selectedCrop);
    }
}

function clearRadius() {
    if (radiusCircle) {
        map.removeLayer(radiusCircle);
        radiusCircle = null;
    }

    // Remove center marker
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.className === 'radius-center-marker') {
            map.removeLayer(layer);
        }
    });

    radiusCenter = null;
    document.getElementById('clear-radius').style.display = 'none';

    // Reload current crop without radius filter
    const selectedCrop = document.getElementById('crop-selector').value;
    if (selectedCrop) {
        loadCropLayer(selectedCrop);
    }
}

function filterByRadius(cropName) {
    if (!radiusCenter || !allMunicipalitiesData) return;

    // Remove existing layer
    if (currentLayer) {
        map.removeLayer(currentLayer);
    }

    // Filter features by distance
    const filteredFeatures = allMunicipalitiesData.features.filter(feature => {
        if (!feature.geometry || !feature.geometry.coordinates) return false;

        // Get feature center (approximate)
        let featureCenter;
        if (feature.geometry.type === 'Polygon') {
            const coords = feature.geometry.coordinates[0];
            const lats = coords.map(coord => coord[1]);
            const lngs = coords.map(coord => coord[0]);
            featureCenter = {
                lat: lats.reduce((a, b) => a + b) / lats.length,
                lng: lngs.reduce((a, b) => a + b) / lngs.length
            };
        } else if (feature.geometry.type === 'MultiPolygon') {
            const coords = feature.geometry.coordinates[0][0];
            const lats = coords.map(coord => coord[1]);
            const lngs = coords.map(coord => coord[0]);
            featureCenter = {
                lat: lats.reduce((a, b) => a + b) / lats.length,
                lng: lngs.reduce((a, b) => a + b) / lngs.length
            };
        } else {
            return false;
        }

        // Calculate distance
        const distance = calculateDistance(
            radiusCenter.lat, radiusCenter.lng,
            featureCenter.lat, featureCenter.lng
        );

        return distance <= radiusKm;
    });

    const filteredData = {
        type: "FeatureCollection",
        features: filteredFeatures
    };

    // Create new layer with filtered data
    currentLayer = L.geoJSON(filteredData, {
        style: function(feature) {
            return getFeatureStyle(feature, cropName);
        },
        onEachFeature: function(feature, layer) {
            setupFeaturePopup(feature, layer, cropName);
        }
    }).addTo(map);

    // Update legend with radius info
    updateMapLegend(cropName, filteredFeatures.length);

    console.log(`Filtered ${filteredFeatures.length} municipalities within ${radiusKm}km radius`);
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Test function to ensure map is working
function testMapVisibility() {
    if (!map) {
        console.error('Map not initialized');
        return;
    }

    console.log('Map center:', map.getCenter());
    console.log('Map zoom:', map.getZoom());
    console.log('Map bounds:', map.getBounds());

    // Add a test marker to verify map is working
    const testMarker = L.marker([-14.2350, -51.9253]).addTo(map);
    testMarker.bindPopup('Centro do Brasil - Teste de Visualização').openPopup();

    setTimeout(() => {
        map.removeLayer(testMarker);
    }, 3000);
}

// Função para remover card analítico de uma camada
function removeAnalyticsCard(layerId) {
    const card = document.getElementById(`analytics-card-${layerId}`);
    if (card) {
        card.remove();
        repositionAnalyticsCards();
        console.log(`Card analítico removido para camada ${layerId}`);
    }
}

// Função para ocultar card analítico de uma camada
function hideAnalyticsCard(layerId) {
    const card = document.getElementById(`analytics-card-${layerId}`);
    if (card) {
        card.remove();
        repositionAnalyticsCards();
        console.log(`Card analítico removido para camada ocultada ${layerId}`);
    }
}

// Função para mostrar card analítico de uma camada
function showAnalyticsCard(layer) {
    // Check if analytics card already exists for this layer
    if (document.getElementById(`analytics-card-${layer.id}`)) {
        console.log(`Analytics card already exists for layer ${layer.id}`);
        return;
    }

    const container = document.getElementById('analytics-cards-container');
    if (!container) {
        console.error('Analytics cards container not found!');
        return;
    }

    const card = L.DomUtil.create('div', 'analytics-card leaflet-bar leaflet-control');
    card.id = `analytics-card-${layer.id}`;
    card.style.position = 'absolute'; // Position will be managed by repositionAnalyticsCards
    card.style.zIndex = '1000';
    card.style.backgroundColor = 'white';
    card.style.padding = '15px';
    card.style.minWidth = '320px';
    card.style.maxWidth = '400px';
    card.style.borderRadius = '8px';
    card.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    card.style.border = '1px solid #e0e0e0';

    let cardHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h6 style="margin: 0; color: #2E7D32; font-weight: 600;">
                <i class="fas fa-chart-line" style="color: ${layer.color || '#4CAF50'}; margin-right: 8px;"></i>
                Dados Analíticos
            </h6>
            <i class="fas fa-times close-card-btn" data-layer-id="${layer.id}" 
               style="cursor: pointer; color: #888; font-size: 14px; padding: 4px;"></i>
        </div>

        <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
            <div style="font-weight: 600; color: #2E7D32; margin-bottom: 5px;">
                ${layer.name}
            </div>
            <div style="font-size: 11px; color: #666;">
                ${layer.description || layer.type}
            </div>
        </div>
    `;

    // Add specific details based on layer type
    if (layer.type === 'receitas') {
        cardHTML += `
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 12px; font-weight: 500;">TOTAL</span>
                    <span style="font-size: 12px; font-weight: 500;">MUNICÍPIOS</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #4CAF50; font-size: 18px; font-weight: 600;">1 mun.</span>
                    <span style="color: #4CAF50; font-size: 18px; font-weight: 600;">1</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <div style="text-align: center;">
                        <div style="font-size: 10px; color: #666;">MÉDIA/MUN.</div>
                        <div style="color: #4CAF50; font-size: 14px; font-weight: 600;">1 mun.</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 10px; color: #666;">ESTADO</div>
                        <div style="color: #4CAF50; font-size: 14px; font-weight: 600;">XX</div>
                    </div>
                </div>
            </div>
        `;
    } else if (layer.type === 'revendas' && layer.data) {
        // Extract municipality details from layer data
        const municipalityDetails = [];
        Object.keys(layer.data).forEach(code => {
            const municipalityData = layer.data[code];
            municipalityDetails.push({
                code: code,
                name: municipalityData.municipality_name || `Município ${code}`,
                state: municipalityData.state_code || 'XX'
            });
        });

        const totalMunicipios = municipalityDetails.length;
        const estadosUnicos = [...new Set(municipalityDetails.map(m => m.state))];
        const estadoPrincipal = estadosUnicos.length === 1 ? estadosUnicos[0] : `${estadosUnicos.length} estados`;

        cardHTML += `
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 12px; font-weight: 500;">TOTAL</span>
                    <span style="font-size: 12px; font-weight: 500;">MUNICÍPIOS</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: ${layer.color || '#4CAF50'}; font-size: 18px; font-weight: 600;">${totalMunicipios} mun.</span>
                    <span style="color: ${layer.color || '#4CAF50'}; font-size: 18px; font-weight: 600;">${totalMunicipios}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <div style="text-align: center;">
                        <div style="font-size: 10px; color: #666;">MÉDIA/MUN.</div>
                        <div style="color: ${layer.color || '#4CAF50'}; font-size: 14px; font-weight: 600;">1 mun.</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 10px; color: #666;">ESTADO${estadosUnicos.length > 1 ? 'S' : ''}</div>
                        <div style="color: ${layer.color || '#4CAF50'}; font-size: 14px; font-weight: 600;">${estadoPrincipal}</div>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <div style="font-size: 12px; font-weight: 500; margin-bottom: 8px; display: flex; align-items: center;">
                    <i class="fas fa-list" style="margin-right: 6px; color: ${layer.color || '#4CAF50'};"></i>
                    Top 5 Municípios
                </div>
                <div style="max-height: 120px; overflow-y: auto;">
                    ${municipalityDetails.length > 0 ? 
                        municipalityDetails.slice(0, 5).map((municipio, index) => `
                            <div style="display: flex; align-items: center; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <div style="width: 20px; height: 15px; background: ${layer.color || '#4CAF50'}; margin-right: 8px; opacity: ${1 - (index * 0.15)};"></div>
                                <div style="flex-grow: 1;">
                                    <div style="font-size: 11px; font-weight: 500;">${municipio.name}</div>
                                    <div style="font-size: 10px; color: #666;">${municipio.state}</div>
                                </div>
                                <div style="color: ${layer.color || '#4CAF50'}; font-size: 10px; font-weight: 600;">Território</div>
                            </div>
                        `).join('') : 
                        '<div style="text-align: center; color: #666; font-size: 11px;">Carregando municípios...</div>'
                    }
                </div>
            </div>

            <div style="margin-bottom: 10px;">
                <div style="font-size: 12px; font-weight: 500; margin-bottom: 8px; display: flex; align-items: center;">
                    <i class="fas fa-trophy" style="margin-right: 6px; color: ${layer.color || '#4CAF50'};"></i>
                    Ranking Detalhado
                </div>
                <div style="max-height: 100px; overflow-y: auto; background: #f8f9fa; border-radius: 4px; padding: 8px;">
                    ${municipalityDetails.length > 0 ? 
                        municipalityDetails.map((municipio, index) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; font-size: 10px;">
                                <span style="font-weight: 500;">${index + 1}º</span>
                                <span style="flex-grow: 1; margin-left: 8px;">${municipio.name} (${municipio.state})</span>
                                <span style="color: ${layer.color || '#4CAF50'}; font-weight: 600;">Território</span>
                            </div>
                        `).join('') :
                        '<div style="text-align: center; color: #666; font-size: 10px;">Carregando municípios...</div>'
                    }
                </div>
            </div>
        `;
    }

    card.innerHTML = cardHTML;
    container.appendChild(card);

    // Add event listener for the close button
    card.querySelector('.close-card-btn').addEventListener('click', function() {
        removeAnalyticsCard(layer.id);
        if (layer.mapLayer) {
            map.removeLayer(layer.mapLayer);
        }
        // Remove from active layers
        window.activeLayers = window.activeLayers.filter(l => l.id !== layer.id);
        updateCombinedLegend();
    });

    repositionAnalyticsCards();
    console.log(`Card analítico adicionado para camada ${layer.id} com ${layer.municipalityDetails?.length || 0} municípios`);
}


// Função para limpar todos os cards analíticos
function clearAllAnalyticsCards() {
    const container = document.getElementById('analytics-cards-container');
    if (container) {
        container.innerHTML = '';
        console.log('Todos os cards analíticos foram removidos');
    }
}

// Função para reposicionar cards analíticos após remoção
function repositionAnalyticsCards() {
    const container = document.getElementById('analytics-cards-container');
    if (!container) return;

    const cards = container.querySelectorAll('.analytics-card');
    cards.forEach((card, index) => {
        const position = calculateCardPosition(index);
        card.style.top = `${position.top}px`;
        card.style.left = `${position.left}px`;
    });
}

// Função para calcular posição do card
function calculateCardPosition(cardIndex) {
    const baseTop = 20;
    const baseLeft = 20;
    const cardHeight = 150; // Reduced height for better general display
    const cardWidth = 320;  // Reduced width
    const margin = 15;      // Reduced margin

    // Determine how many cards fit vertically in the viewport
    const availableHeight = window.innerHeight - baseTop - margin;
    const cardsPerColumn = Math.max(1, Math.floor(availableHeight / (cardHeight + margin)));

    const column = Math.floor(cardIndex / cardsPerColumn);
    const row = cardIndex % cardsPerColumn;

    return {
        top: baseTop + (row * (cardHeight + margin)),
        left: baseLeft + (column * (cardWidth + margin))
    };
}

function toggleRevendasPanel() {
    if (revendasPanel) {
        map.removeControl(revendasPanel);
        revendasPanel = null;
        return;
    }

    loadRevendasData().then(() => {
        createRevendasPanel();
    });
}

function createRevendasPanel() {
    revendasPanel = L.control({ position: 'topleft' });

    revendasPanel.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'revendas-panel leaflet-bar leaflet-control');
        div.style.backgroundColor = 'white';
        div.style.padding = '15px';
        div.style.minWidth = '280px';
        div.style.maxHeight = '500px';
        div.style.overflowY = 'auto';

        let panelHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #FF5722; padding-bottom: 10px;">
                <h6 style="margin: 0; color: #FF5722; font-weight: 600;">
                    <i class="fas fa-store"></i> Territórios de Revendas
                </h6>
                <i class="fas fa-times close-panel-btn" style="cursor: pointer; color: #888; font-size: 14px; padding: 4px;" onclick="closeRevendasPanel()"></i>
            </div>
        `;

        if (revendasData.length === 0) {
            panelHTML += `
                <div style="text-align: center; color: #666; padding: 20px;">
                    <i class="fas fa-store" style="font-size: 32px; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>Nenhuma revenda cadastrada</p>
                    <a href="/revendas" style="color: #FF5722; text-decoration: none;">
                        <i class="fas fa-plus"></i> Cadastrar Revendas
                    </a>
                </div>
            `;
        } else {
            // Botões de controle para seleção múltipla
            panelHTML += `
                <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                    <div style="font-size: 12px; font-weight: 500; margin-bottom: 8px; color: #333;">
                        <i class="fas fa-hand-pointer"></i> Seleção Múltipla
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button id="select-all-revendas" class="btn btn-sm btn-outline-primary" style="flex: 1; font-size: 11px;">
                            <i class="fas fa-check-double"></i> Todas
                        </button>
                        <button id="clear-all-revendas" class="btn btn-sm btn-outline-secondary" style="flex: 1; font-size: 11px;">
                            <i class="fas fa-times"></i> Limpar
                        </button>
                    </div>
                    <div id="selected-count" style="font-size: 10px; color: #666; margin-top: 5px; text-align: center;">
                        0 de ${revendasData.length} selecionadas
                    </div>
                </div>
            `;

            panelHTML += `<div style="margin-bottom: 10px;">`;
            revendasData.forEach(revenda => {
                const isSelected = selectedRevendas.some(r => r.id === revenda.id);
                const selectedClass = isSelected ? 'revenda-selected' : '';
                const selectedStyle = isSelected ? `background: ${revenda.cor}20; border-color: ${revenda.cor}; box-shadow: 0 2px 8px ${revenda.cor}40;` : '';

                panelHTML += `
                    <div class="revenda-item ${selectedClass}" 
                         data-revenda-id="${revenda.id}"
                         style="display: flex; align-items: center; justify-content: space-between; padding: 10px; margin-bottom: 8px; border: 1px solid #eee; border-radius: 8px; cursor: pointer; transition: all 0.3s; ${selectedStyle}" 
                         onclick="toggleRevendaSelection(${revenda.id})" 
                         onmouseover="this.style.transform='scale(1.02)'" 
                         onmouseout="this.style.transform='scale(1)'">
                        <div style="display: flex; align-items: center;">
                            <div style="width: 12px; height: 12px; background: ${revenda.cor}; border-radius: 50%; margin-right: 8px; border: 1px solid #ddd;"></div>
                            <div>
                                <strong style="color: #333; font-size: 13px;">${revenda.nome}</strong>
                                <div style="font-size: 11px; color: #666; margin-top: 2px;">
                                    CNPJ: ${revenda.cnpj || 'N/A'}
                                </div>
                                <div style="font-size: 11px; color: #666; margin-top: 3px;">
                                    <i class="fas fa-map-marker-alt"></i> ${revenda.municipios_count || 0} municípios
                                </div>
                            </div>
                        </div>
                        <div class="selection-indicator" style="display: ${isSelected ? 'block' : 'none'};">
                            <i class="fas fa-check-circle" style="color: ${revenda.cor}; font-size: 14px;"></i>
                        </div>
                    </div>
                `;
            });
            panelHTML += `</div>`;

            panelHTML += `
                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;">
                    <button id="show-selected-territories" class="btn btn-sm btn-primary" style="width: 100%; margin-bottom: 5px;" ${selectedRevendas.length === 0 ? 'disabled' : ''}>
                        <i class="fas fa-map"></i> Mostrar Territórios (${selectedRevendas.length})
                    </button>
                    <button id="clear-revenda-territory" class="btn btn-sm btn-outline-secondary" style="width: 100%; margin-bottom: 5px;" ${selectedRevendas.length === 0 ? 'disabled' : ''}>
                        <i class="fas fa-eraser"></i> Limpar Visualização
                    </button>
                    <a href="/revendas" style="display: inline-block; width: 100%; text-align: center; color: #FF5722; text-decoration: none; font-size: 12px;">
                        <i class="fas fa-cog"></i> Gerenciar Revendas
                    </a>
                </div>
            `;
        }

        div.innerHTML = panelHTML;

        // Add event listeners
        const selectAllBtn = div.querySelector('#select-all-revendas');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                selectAllRevendas();
            });
        }

        const clearAllBtn = div.querySelector('#clear-all-revendas');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                clearAllRevendasSelection();
            });
        }

        const showSelectedBtn = div.querySelector('#show-selected-territories');
        if (showSelectedBtn) {
            showSelectedBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showSelectedRevendasTerritories();
            });
        }

        const clearBtn = div.querySelector('#clear-revenda-territory');
        if (clearBtn) {
            clearBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                clearRevendaTerritory();
            });
        }

        return div;
    };

    revendasPanel.addTo(map);
}

async function loadRevendasData() {
    try {
        const response = await fetch('/api/revendas');
        const data = await response.json();

        if (data.success) {
            revendasData = data.revendas;
            console.log('Revendas carregadas:', revendasData.length);
        } else {
            console.error('Erro ao carregar revendas:', data.error);
            alert('Erro ao carregar revendas: ' + data.error);
        }
    } catch (error) {
        console.error('Erro de rede ao carregar revendas:', error);
        alert('Erro de conexão ao carregar revendas');
    }
}

// Função para alternar seleção de uma revenda
function toggleRevendaSelection(revendaId) {
    const revenda = revendasData.find(r => r.id === revendaId);
    if (!revenda) return;

    const index = selectedRevendas.findIndex(r => r.id === revendaId);

    if (index > -1) {
        // Remove da seleção
        selectedRevendas.splice(index, 1);
    } else {
        // Adiciona à seleção
        selectedRevendas.push(revenda);
    }

    updateRevendasPanelSelection();
}

// Função para selecionar todas as revendas
function selectAllRevendas() {
    selectedRevendas = [...revendasData];
    updateRevendasPanelSelection();
}

// Função para limpar todas as seleções
function clearAllRevendasSelection() {
    selectedRevendas = [];
    updateRevendasPanelSelection();
}

// Função para atualizar a interface do painel
function updateRevendasPanelSelection() {
    // Atualizar contador
    const countElement = document.querySelector('#selected-count');
    if (countElement) {
        countElement.textContent = `${selectedRevendas.length} de ${revendasData.length} selecionadas`;
    }

    // Atualizar botões
    const showBtn = document.querySelector('#show-selected-territories');
    const clearBtn = document.querySelector('#clear-revenda-territory');

    if (showBtn) {
        showBtn.disabled = selectedRevendas.length === 0;
        showBtn.innerHTML = `<i class="fas fa-map"></i> Mostrar Territórios (${selectedRevendas.length})`;
    }

    if (clearBtn) {
        clearBtn.disabled = selectedRevendas.length === 0;
    }

    // Atualizar itens visuais
    revendasData.forEach(revenda => {
        const item = document.querySelector(`[data-revenda-id="${revenda.id}"]`);
        if (item) {
            const isSelected = selectedRevendas.some(r => r.id === revenda.id);
            const indicator = item.querySelector('.selection-indicator');

            if (isSelected) {
                item.classList.add('revenda-selected');
                item.style.background = `${revenda.cor}20`;
                item.style.borderColor = revenda.cor;
                item.style.boxShadow = `0 2px 8px ${revenda.cor}40`;
                if (indicator) indicator.style.display = 'block';
            } else {
                item.classList.remove('revenda-selected');
                item.style.background = 'white';
                item.style.borderColor = '#eee';
                item.style.boxShadow = 'none';
                if (indicator) indicator.style.display = 'none';
            }
        }
    });
}

// Função para mostrar territórios das revendas selecionadas (VERSÃO CORRIGIDA)
async function showSelectedRevendasTerritories() {
    if (selectedRevendas.length === 0) {
        alert("Nenhuma revenda selecionada.");
        return;
    }

    // Limpar camadas de territórios existentes
    clearAllRevendaLayers();

    let allBounds = L.latLngBounds();
    let hasValidBounds = false;
    let territoriesLoaded = 0;

    // Pré-carrega o GeoJSON se ainda não estiver carregado
    if (!allMunicipalitiesData) {
        try {
            console.log("[GEO] Carregando arquivo GeoJSON principal...");
            const response = await fetch('/static/data/brazil_municipalities_all.geojson');
            if (!response.ok) throw new Error('Falha ao carregar o arquivo GeoJSON principal.');
            allMunicipalitiesData = await response.json();
            console.log("[GEO] GeoJSON principal carregado com sucesso.");
        } catch (error) {
            console.error(error);
            alert("Não foi possível carregar os dados do mapa. Tente recarregar a página.");
            return;
        }
    }

    for (const revenda of selectedRevendas) {
        try {
            console.log(`[API] Carregando território da revenda: ${revenda.nome} (ID: ${revenda.id})`);
            const response = await fetch(`/api/revendas/data/${revenda.id}`);
            const data = await response.json();

            if (!data.success || !data.data) {
                 console.error(`Erro na API para revenda ${revenda.nome}:`, data.error || 'Dados não encontrados.');
                 continue; // Pula para a próxima revenda
            }

            let territoryCodes;

            // **INÍCIO DA CORREÇÃO**
            // Verifica se data.data é um array ou um objeto e extrai os códigos
            if (Array.isArray(data.data)) {
                // Cenário 1: API retorna um array de códigos. Ex: ['3500105', '3500303']
                territoryCodes = data.data;
                console.log(`[DADOS] Recebido ARRAY com ${territoryCodes.length} códigos para ${revenda.nome}.`);
            } else if (typeof data.data === 'object' && data.data !== null) {
                // Cenário 2: API retorna um objeto. Ex: {'3500105': {...}, '3500303': {...}}
                territoryCodes = Object.keys(data.data);
                console.log(`[DADOS] Recebido OBJETO com ${territoryCodes.length} códigos para ${revenda.nome}.`);
            } else {
                console.error(`Erro ao carregar território da revenda ${revenda.nome}: Formato de dados inesperado.`, data.data);
                continue; // Pula para a próxima revenda
            }
            // **FIM DA CORREÇÃO**
            
            if (territoryCodes.length > 0) {
                 const layer = createRevendaLayer(revenda, territoryCodes, allMunicipalitiesData);
                
                if (layer && layer.getBounds().isValid()) {
                    allBounds.extend(layer.getBounds());
                    hasValidBounds = true;
                    territoriesLoaded++;
                }
            } else {
                 console.warn(`Nenhum município encontrado nos dados para a revenda ${revenda.nome}.`);
            }

        } catch (error) {
            console.error(`Erro de conexão ao carregar território da revenda ${revenda.nome}:`, error);
        }
    }

    if (hasValidBounds) {
        map.fitBounds(allBounds, { padding: [50, 50] });
        console.log(`[MAPA] Mapa ajustado para exibir ${territoriesLoaded} territórios.`);
    } else {
        alert('Nenhum território válido pôde ser carregado no mapa. Verifique o console para mais detalhes.');
    }
}

/**
 * Cria a camada GeoJSON para o território de uma revenda, aplica o estilo,
 * configura os pop-ups e a adiciona ao mapa.
 *
 * @param {object} revenda - O objeto da revenda contendo nome, cor, etc.
 * @param {string[]} territoryCodes - Um array com os códigos dos municípios do território.
 * @param {object} geoData - O objeto GeoJSON com todos os municípios do Brasil.
 * @returns {object|null} - A camada Leaflet criada ou null se não houver municípios.
 */
function createRevendaLayer(revenda, territoryCodes, geoData) {
    if (!revenda || !territoryCodes || !geoData) {
        console.error("[CRITICAL] createRevendaLayer foi chamada com dados inválidos.");
        return null;
    }

    const territorySet = new Set(territoryCodes.map(String));

    const filteredFeatures = geoData.features.filter(feature => {
        const code = String(
            feature.properties.GEOCODIGO ||
            feature.properties.CD_MUN ||
            feature.properties.cd_geocmu ||
            feature.properties.geocodigo ||
            feature.properties.CD_GEOCMU || ''
        );
        return territorySet.has(code);
    });

    console.log(`[FILTRO] RESULTADO para ${revenda.nome}: ${filteredFeatures.length} de ${territorySet.size} municípios encontrados no mapa.`);

    if (filteredFeatures.length === 0) {
        console.warn(`[ALERTA] Nenhum polígono encontrado no GeoJSON para a revenda ${revenda.nome}.`);
        return null;
    }

    // Cria a camada GeoJSON, definindo estilo e pop-ups internamente.
    const mapLayer = L.geoJSON({ type: "FeatureCollection", features: filteredFeatures }, {
        
        // Função para definir o estilo (cor da borda)
        style: function(feature) {
            return {
                fillColor: 'transparent',
                fillOpacity: 0,
                weight: 3,
                opacity: 1,
                color: revenda.cor || '#FF5722', // Usa a cor da revenda
                dashArray: null
            };
        },

        // Função para configurar o pop-up de cada município
        onEachFeature: function(feature, layer) {
            const municipalityCode = feature.properties.GEOCODIGO || feature.properties.CD_MUN || feature.properties.cd_geocmu || feature.properties.geocodigo || 'N/A';
            const municipalityName = feature.properties.NOME || feature.properties.NM_MUN || feature.properties.nm_mun || feature.properties.nome || 'Nome não disponível';
            const stateUF = feature.properties.UF || feature.properties.SIGLA_UF || feature.properties.uf || 'N/A';

            let popupContent = `<strong>${municipalityName} (${stateUF})</strong><br><hr>`;
            popupContent += `<b>Revenda:</b> ${revenda.nome}<br>`; // Usa o nome da revenda
            popupContent += `<b>Território de Atuação</b><br>`;
            popupContent += `<b>Código IBGE:</b> ${municipalityCode}`;

            layer.bindPopup(popupContent);
        }

    }).addTo(map);

    // Armazena a camada para poder removê-la depois
    revendaLayers.push({ layer: mapLayer, revenda: revenda });

    console.log(`[MAPA] Camada para a revenda "${revenda.nome}" criada e adicionada com sucesso.`);
    return mapLayer;
}

// Manter função original para compatibilidade, mas direcionar para nova lógica
async function showRevendaTerritory(revendaId) {
    // Limpar seleções anteriores e selecionar apenas esta
    selectedRevendas = [revendasData.find(r => r.id === revendaId)].filter(Boolean);
    updateRevendasPanelSelection();
    await showSelectedRevendasTerritories();
}


// Função para carregar território de revenda no mapa
async function loadMunicipalityBoundariesForRevendasLayer(layer, layerData, minMax) {
    try {
        console.log(`Carregando território da revenda: ${layer.name}`);
        console.log('Dados da camada recebidos:', layerData);

        // Try to get the best GeoJSON file first
        const geoJsonFiles = [
            '/static/data/brazil_municipalities_all.geojson',
            '/static/data/brazil_municipalities.geojson',
            '/static/data/municipios.geojson',
            '/static/data/brazil_municipalities_simple.geojson'
        ];

        let geoData = null;

        for (const filePath of geoJsonFiles) {
            try {
                console.log(`Tentando carregar: ${filePath}`);
                const response = await fetch(filePath);
                if (response.ok) {
                    geoData = await response.json();
                    console.log(`GeoJSON carregado com sucesso: ${filePath}, ${geoData.features.length} municípios`);
                    break;
                }
            } catch (error) {
                console.log(`Erro ao carregar ${filePath}:`, error);
                continue;
            }
        }

        if (!geoData) {
            throw new Error('Nenhum arquivo GeoJSON pôde ser carregado');
        }

        // Get municipality codes from the layer data
        const territoryMunicipalities = new Set();
        
        // Handle different data structures
        if (Array.isArray(layerData)) {
            // If layerData is an array of municipality codes
            layerData.forEach(code => territoryMunicipalities.add(String(code)));
        } else if (typeof layerData === 'object') {
            // If layerData is an object with municipality codes as keys
            Object.keys(layerData).forEach(code => territoryMunicipalities.add(String(code)));
        }

        console.log('Municípios do território da revenda:', Array.from(territoryMunicipalities));

        if (territoryMunicipalities.size === 0) {
            console.error('ERRO: Nenhum código de município encontrado nos dados da revenda');
            return;
        }

        // Filter GeoJSON features that match the territory municipalities
        const filteredFeatures = geoData.features.filter(feature => {
            const municipalityCode = String(
                feature.properties.GEOCODIGO ||
                feature.properties.CD_MUN ||
                feature.properties.cd_geocmu ||
                feature.properties.geocodigo ||
                feature.properties.CD_GEOCMU ||
                feature.properties.code ||
                ''
            );

            const isInTerritory = territoryMunicipalities.has(municipalityCode);
            if (isInTerritory) {
                const municipalityName = feature.properties.NOME || feature.properties.NM_MUN || feature.properties.nm_mun || feature.properties.name;
                console.log(`✓ Município encontrado: ${municipalityCode} - ${municipalityName}`);
            }
            return isInTerritory;
        });

        console.log(`RESULTADO: ${filteredFeatures.length} municípios filtrados para o território da revenda`);

        if (filteredFeatures.length === 0) {
            console.error('ERRO: Nenhum município do GeoJSON corresponde aos códigos do território');
            console.error('Códigos procurados:', Array.from(territoryMunicipalities));
            
            // Debug: Show first few GeoJSON municipality codes for comparison
            if (geoData.features.length > 0) {
                console.log('Exemplos de códigos no GeoJSON:');
                geoData.features.slice(0, 5).forEach(feature => {
                    const code = feature.properties.GEOCODIGO || feature.properties.CD_MUN || feature.properties.cd_geocmu;
                    console.log(`  ${code} - ${feature.properties.NOME || feature.properties.NM_MUN}`);
                });
            }
            
            // Create fallback visualization with markers if no GeoJSON features match
            const fallbackLayer = createFallbackRevendaVisualization(layer, layerData);
            if (fallbackLayer) {
                layer.mapLayer = fallbackLayer;
                if (layer.visible !== false) {
                    fallbackLayer.addTo(map);
                }
                console.log('Visualização alternativa criada com marcadores');
            }
            return;
        }

        const filteredData = {
            type: "FeatureCollection",
            features: filteredFeatures
        };

        // Create a new GeoJSON layer with visible borders
        const mapLayer = L.geoJSON(filteredData, {
            style: function(feature) {
                return getFeatureStyleForRevendasLayer(feature, layer);
            },
            onEachFeature: function(feature, mapFeature) {
                setupFeaturePopupForRevendasLayer(feature, mapFeature, layer);
            }
        });

        layer.mapLayer = mapLayer;
        layer.minMax = minMax;
        layer.data = layerData;

        // Add to map if visible
        if (layer.visible !== false) {
            mapLayer.addTo(map);
            console.log(`✓ Território da revenda ${layer.name} adicionado ao mapa com ${filteredFeatures.length} municípios`);
        }

        // Update combined legend
        updateCombinedLegend();

    } catch (error) {
        console.error(`Erro ao carregar GeoJSON para revendas:`, error);
        alert('Erro ao carregar dados geográficos dos municípios para revendas: ' + error.message);
    }
}

/**
 * Define o estilo para a camada de território de uma revenda.
 * Esta função desenha apenas a borda do território, sem preenchimento.
 * * @param {object} feature - O recurso GeoJSON do município (não utilizado aqui).
 * @param {object} revenda - O objeto da revenda que contém os dados, incluindo a cor.
 * @returns {object} - O objeto de estilo para o Leaflet.
 */
function getFeatureStyleForRevendasLayer(feature, revenda) {
    // Verifica se o objeto revenda é válido para evitar erros
    if (!revenda) {
        console.error("[STYLE] Objeto 'revenda' inválido recebido.");
        // Retorna um estilo padrão de erro
        return { color: '#FF0000', weight: 2, fillOpacity: 0 };
    }

    return {
        // Estilos do Preenchimento (totalmente transparente)
        fillColor: 'transparent',
        fillOpacity: 0,

        // Estilos da Borda (a única parte visível)
        weight: 3,                // Espessura da borda
        opacity: 1,               // Borda totalmente opaca
        color: revenda.cor || '#FF5722', // Usa a cor da revenda ou um padrão laranja
        dashArray: null           // Linha sólida
    };
}

function setupFeaturePopupForRevendasLayer(feature, mapFeature, layer) {
    const municipalityCode = feature.properties.GEOCODIGO || feature.properties.CD_MUN || feature.properties.cd_geocmu || feature.properties.geocodigo;
    const municipalityName = feature.properties.NOME || feature.properties.NM_MUN || feature.properties.nm_mun || feature.properties.nome || 'Nome não disponível';
    const stateUF = feature.properties.UF || feature.properties.SIGLA_UF || feature.properties.uf;

    let popupContent = `<strong>${municipalityName}</strong>`;
    if (stateUF) {
        popupContent += ` (${stateUF})`;
    }
    popupContent += `<br>`;

    // Extrair o nome da revenda do nome da camada (removendo "Território - ")
    const revendaName = layer.name.replace('Território - ', '');

    popupContent += `
        Revenda: ${revendaName}<br>
        Território de Atuação<br>
        Código: ${municipalityCode}
    `;

    mapFeature.bindPopup(popupContent);
}

// Função para criar visualização alternativa (marcadores) se GeoJSON falhar
function createFallbackRevendaVisualization(layer, layerData) {
    const fallbackMarkers = [];
    const fallbackBounds = L.latLngBounds();
    let hasFallbackData = false;

    Object.keys(layerData).forEach(municipioCode => {
        const municipalityData = layerData[municipioCode];
        const lat = municipalityData.lat || (Math.random() * 10 - 25); // Fallback coordinates
        const lng = municipalityData.lng || (Math.random() * 20 - 65); // Fallback coordinates

        if (lat && lng) {
            const marker = L.circleMarker([lat, lng], {
                radius: 8,
                fillColor: layer.color || '#FF5722',
                color: '#FFFFFF',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.7
            });

            let popupContent = `<strong>${municipalityData.municipality_name || `Município ${municipioCode}`}</strong>`;
            if (municipalityData.state_code) {
                popupContent += ` (${municipalityData.state_code})`;
            }
            popupContent += `<br>Revenda: ${layer.name}<br>Território de Atuação`;

            marker.bindPopup(popupContent);
            fallbackMarkers.push(marker);
            fallbackBounds.extend([lat, lng]);
            hasFallbackData = true;
        }
    });

    if (hasFallbackData) {
        const fallbackLayer = L.layerGroup(fallbackMarkers);
        if (fallbackLayer.getBounds().isValid()) {
            // Fit map to bounds if available
            map.fitBounds(fallbackBounds, { padding: [20, 20] });
        }
        return fallbackLayer;
    }

    return null;
}


// Função para limpar todas as camadas de revendas
function clearAllRevendaLayers() {
    revendaLayers.forEach(item => {
        if (item.layer) {
            map.removeLayer(item.layer);
        }
    });
    revendaLayers = [];

    // Limpar também a camada única antiga (compatibilidade)
    if (currentRevendaLayer) {
        map.removeLayer(currentRevendaLayer);
        currentRevendaLayer = null;
    }
}

function clearRevendaTerritory() {
    // Limpar todas as camadas de revendas
    clearAllRevendaLayers();

    // Limpar seleções
    selectedRevendas = [];

    // Atualizar interface do painel
    updateRevendasPanelSelection();

    // Disable clear button
    const clearBtn = document.querySelector('#clear-revenda-territory');
    if (clearBtn) {
        clearBtn.disabled = true;
        clearBtn.innerHTML = '<i class="fas fa-eraser"></i> Limpar Território';
    }

    // Reset map view
    resetMapView();

    console.log('Todos os territórios de revendas removidos');
}

// Vendedores functions
function toggleVendedoresPanel() {
    if (vendedoresPanel) {
        map.removeControl(vendedoresPanel);
        vendedoresPanel = null;
        return;
    }

    loadVendedoresData().then(() => {
        createVendedoresPanel();
    });
}

async function loadVendedoresData() {
    try {
        const response = await fetch('/api/vendedores');
        const data = await response.json();

        if (data.success) {
            vendedoresData = data.vendedores;
            console.log('Vendedores carregados:', vendedoresData.length);
        } else {
            console.error('Erro ao carregar vendedores:', data.error);
            alert('Erro ao carregar vendedores: ' + data.error);
        }
    } catch (error) {
        console.error('Erro de rede ao carregar vendedores:', error);
        alert('Erro de conexão ao carregar vendedores');
    }
}

function createVendedoresPanel() {
    vendedoresPanel = L.control({ position: 'topleft' });

    vendedoresPanel.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'vendedores-panel leaflet-bar leaflet-control');
        div.style.backgroundColor = 'white';
        div.style.padding = '15px';
        div.style.minWidth = '280px';
        div.style.maxHeight = '500px';
        div.style.overflowY = 'auto';

        let panelHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #2196F3; padding-bottom: 10px;">
                <h6 style="margin: 0; color: #2196F3; font-weight: 600;">
                    <i class="fas fa-user-tie"></i> Territórios de Vendedores
                </h6>
                <i class="fas fa-times close-panel-btn" style="cursor: pointer; color: #888; font-size: 14px; padding: 4px;" onclick="closeVendedoresPanel()"></i>
            </div>
        `;

        if (vendedoresData.length === 0) {
            panelHTML += `
                <div style="text-align: center; color: #666; padding: 20px;">
                    <i class="fas fa-user-tie" style="font-size: 32px; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>Nenhum vendedor cadastrado</p>
                    <a href="/vendedores" style="color: #2196F3; text-decoration: none;">
                        <i class="fas fa-plus"></i> Cadastrar Vendedores
                    </a>
                </div>
            `;
        } else {
            // Botões de controle para seleção múltipla
            panelHTML += `
                <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                    <div style="font-size: 12px; font-weight: 500; margin-bottom: 8px; color: #333;">
                        <i class="fas fa-hand-pointer"></i> Seleção Múltipla
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button id="select-all-vendedores" class="btn btn-sm btn-outline-primary" style="flex: 1; font-size: 11px;">
                            <i class="fas fa-check-double"></i> Todos
                        </button>
                        <button id="clear-all-vendedores" class="btn btn-sm btn-outline-secondary" style="flex: 1; font-size: 11px;">
                            <i class="fas fa-times"></i> Limpar
                        </button>
                    </div>
                    <div id="selected-vendedores-count" style="font-size: 10px; color: #666; margin-top: 5px; text-align: center;">
                        0 de ${vendedoresData.length} selecionadas
                    </div>
                </div>
            `;

            panelHTML += `<div style="margin-bottom: 10px;">`;
            vendedoresData.forEach(vendedor => {
                const isSelected = selectedVendedores.some(v => v.id === vendedor.id);
                const selectedClass = isSelected ? 'vendedor-selected' : '';
                const selectedStyle = isSelected ? `background: ${vendedor.cor}20; border-color: ${vendedor.cor}; box-shadow: 0 2px 8px ${vendedor.cor}40;` : '';

                panelHTML += `
                    <div class="vendedor-item ${selectedClass}" 
                         data-vendedor-id="${vendedor.id}"
                         style="display: flex; align-items: center; padding: 10px; margin-bottom: 8px; border: 1px solid #eee; border-radius: 8px; cursor: pointer; transition: all 0.3s; ${selectedStyle}" 
                         onclick="toggleVendedorSelection(${vendedor.id})" 
                         onmouseover="this.style.transform='scale(1.02)'" 
                         onmouseout="this.style.transform='scale(1)'">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
                            <div style="display: flex; align-items: center;">
                                <div style="width: 12px; height: 12px; background: ${vendedor.cor}; border-radius: 50%; margin-right: 8px; border: 1px solid #ddd;"></div>
                                <strong style="color: #333; font-size: 13px;">${vendedor.nome}</strong>
                            </div>
                            <div class="vendedor-selection-indicator" style="display: ${isSelected ? 'block' : 'none'};">
                                <i class="fas fa-check-circle" style="color: ${vendedor.cor}; font-size: 14px;"></i>
                            </div>
                        </div>
                        <div style="font-size: 11px; color: #666;">
                            E-mail: ${vendedor.email}
                        </div>
                        <div style="font-size: 11px; color: #666; margin-top: 3px;">
                            <i class="fas fa-map-marker-alt"></i> ${vendedor.municipios_count} municípios
                        </div>
                    </div>
                `;
            });
            panelHTML += `</div>`;

            panelHTML += `
                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;">
                    <button id="show-selected-vendedores-territories" class="btn btn-sm btn-primary" style="width: 100%; margin-bottom: 5px;" ${selectedVendedores.length === 0 ? 'disabled' : ''}>
                        <i class="fas fa-map"></i> Mostrar Territórios (${selectedVendedores.length})
                    </button>
                    <button id="clear-vendedor-territory" class="btn btn-sm btn-outline-secondary" style="width: 100%; margin-bottom: 5px;" ${selectedVendedores.length === 0 ? 'disabled' : ''}>
                        <i class="fas fa-eraser"></i> Limpar Visualização
                    </button>
                    <a href="/vendedores" style="display: inline-block; width: 100%; text-align: center; color: #2196F3; text-decoration: none; font-size: 12px;">
                        <i class="fas fa-cog"></i> Gerenciar Vendedores
                    </a>
                </div>
            `;
        }

        div.innerHTML = panelHTML;

        // Add event listeners
        const closeBtn = div.querySelector('#close-vendedores-panel');
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleVendedoresPanel();
            });
        }

        const selectAllBtn = div.querySelector('#select-all-vendedores');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                selectAllVendedores();
            });
        }

        const clearAllBtn = div.querySelector('#clear-all-vendedores');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                clearAllVendedoresSelection();
            });
        }

        const showSelectedBtn = div.querySelector('#show-selected-vendedores-territories');
        if (showSelectedBtn) {
            showSelectedBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showSelectedVendedoresTerritories();
            });
        }

        const clearBtn = div.querySelector('#clear-vendedor-territory');
        if (clearBtn) {
            clearBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                clearVendedorTerritory();
            });
        }

        return div;
    };

    vendedoresPanel.addTo(map);
}

function toggleVendedorSelection(vendedorId) {
    const vendedor = vendedoresData.find(v => v.id === vendedorId);
    if (!vendedor) return;

    const index = selectedVendedores.findIndex(v => v.id === vendedorId);

    if (index > -1) {
        selectedVendedores.splice(index, 1);
    } else {
        selectedVendedores.push(vendedor);
    }

    updateVendedoresPanelSelection();
}

function selectAllVendedores() {
    selectedVendedores = [...vendedoresData];
    updateVendedoresPanelSelection();
}

function clearAllVendedoresSelection() {
    selectedVendedores = [];
    updateVendedoresPanelSelection();
}

function updateVendedoresPanelSelection() {
    // Atualizar contador
    const countElement = document.querySelector('#selected-vendedores-count');
    if (countElement) {
        countElement.textContent = `${selectedVendedores.length} de ${vendedoresData.length} selecionadas`;
    }

    // Atualizar botões
    const showBtn = document.querySelector('#show-selected-vendedores-territories');
    const clearBtn = document.querySelector('#clear-vendedor-territory');

    if (showBtn) {
        showBtn.disabled = selectedVendedores.length === 0;
        showBtn.innerHTML = `<i class="fas fa-map"></i> Mostrar Territórios (${selectedVendedores.length})`;
    }

    if (clearBtn) {
        clearBtn.disabled = selectedVendedores.length === 0;
    }

    // Atualizar itens visuais
    vendedoresData.forEach(vendedor => {
        const item = document.querySelector(`[data-vendedor-id="${vendedor.id}"]`);
        if (item) {
            const isSelected = selectedVendedores.some(v => v.id === vendedor.id);
            const indicator = item.querySelector('.vendedor-selection-indicator');

            if (isSelected) {
                item.classList.add('vendedor-selected');
                item.style.background = `${vendedor.cor}20`;
                item.style.borderColor = vendedor.cor;
                item.style.boxShadow = `0 2px 8px ${vendedor.cor}40`;
                if (indicator) indicator.style.display = 'block';
            } else {
                item.classList.remove('vendedor-selected');
                item.style.background = 'white';
                item.style.borderColor = '#eee';
                item.style.boxShadow = 'none';
                if (indicator) indicator.style.display = 'none';
            }
        }
    });
}

async function showSelectedVendedoresTerritories() {
    if (selectedVendedores.length === 0) return;

    clearAllVendedorLayers();

    let allBounds = L.latLngBounds();
    let hasValidBounds = false;

    for (const vendedor of selectedVendedores) {
        try {
            console.log(`Carregando território do vendedor: ${vendedor.nome}`);

            const response = await fetch(`/api/vendedores/data/${vendedor.id}`);
            const data = await response.json();

            if (data.success && data.data) {
                console.log(`Dados carregados para ${vendedor.nome}:`, Object.keys(data.data).length, 'municípios');

                const vendedorLayer = {
                    id: `vendedor-${vendedor.id}`,
                    name: `Território - ${vendedor.nome}`,
                    type: 'vendedores',
                    color: vendedor.cor || '#2196F3',
                    visible: true
                };

                await loadVendedorTerritoryOnMap(vendedorLayer, data.data);

                if (vendedorLayer.mapLayer && vendedorLayer.mapLayer.getBounds().isValid()) {
                    allBounds.extend(vendedorLayer.mapLayer.getBounds());
                    hasValidBounds = true;
                }
            } else {
                console.error('Erro ao carregar território do vendedor:', data.error);
                alert(`Erro ao carregar território do vendedor ${vendedor.nome}: ${data.error || 'Dados não encontrados'}`);
            }
        } catch (error) {
            console.error('Erro ao carregar território:', error);
            alert(`Erro de conexão ao carregar território do vendedor ${vendedor.nome}`);
        }
    }

    if (hasValidBounds) {
        map.fitBounds(allBounds, { padding: [20, 20] });
        console.log(`Ajustando mapa para mostrar ${selectedVendedores.length} territórios de vendedores`);
    }

    const clearBtn = document.querySelector('#clear-vendedor-territory');
    if (clearBtn && selectedVendedores.length > 0) {
        clearBtn.disabled = false;
        clearBtn.innerHTML = `<i class="fas fa-eraser"></i> Limpar ${selectedVendedores.length} Território${selectedVendedores.length > 1 ? 's' : ''}`;
    }
}

let vendedorLayers = [];

async function loadVendedorTerritoryOnMap(layer, territoryData) {
    try {
        console.log(`Carregando território do vendedor: ${layer.name}`);

        const response = await fetch('/static/data/brazil_municipalities_all.geojson');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const geoData = await response.json();
        console.log(`GeoJSON carregado: ${geoData.features.length} municípios`);

        const territoryMunicipalities = new Set(Object.keys(territoryData));
        console.log('Municípios do território do vendedor:', Array.from(territoryMunicipalities));

        const filteredFeatures = geoData.features.filter(feature => {
            const municipalityCode = String(
                feature.properties.GEOCODIGO ||
                feature.properties.CD_MUN ||
                feature.properties.cd_geocmu ||
                feature.properties.geocodigo ||
                feature.properties.CD_GEOCMU || ''
            );

            return territoryMunicipalities.has(municipalityCode);
        });

        console.log(`Filtrados ${filteredFeatures.length} municípios para o território do vendedor`);

        if (filteredFeatures.length === 0) {
            console.warn(`Nenhum município encontrado no território do vendedor ${layer.name}`);
            return null;
        }

        const filteredData = {
            type: "FeatureCollection",
            features: filteredFeatures
        };

        const territoryLayer = L.geoJSON(filteredData, {
            style: function(feature) {
                return getFeatureStyleForVendedorLayer(feature, layer); // Passando vendedor para estilos
            },
            onEachFeature: function(feature, mapFeature) {
                setupFeaturePopupForVendedorLayer(feature, mapFeature, layer); // Passando vendedor para popups
            }
        });

        territoryLayer.addTo(map);

        const layerBounds = territoryLayer.getBounds();

        vendedorLayers.push({
            layer: territoryLayer,
            vendedor: layer, // Store layer object as vendedor for consistency
            bounds: layerBounds
        });

        console.log(`Território do vendedor ${layer.name} exibido com ${filteredFeatures.length} municípios`);

        return layerBounds;

    } catch (error) {
        console.error(`Erro ao carregar território do vendedor ${layer.name}:`, error);
        throw error;
    }
}

function getFeatureStyleForVendedorLayer(feature, vendedor) {
    return {
        // --- Estilos do Preenchimento (Interior do Polígono) ---
        fillColor: 'transparent', // Garante que a cor do preenchimento seja transparente.
        fillOpacity: 0,           // Define a opacidade do preenchimento como 0 (totalmente invisível).

        // --- Estilos da Borda (Linha do Polígono) ---
        weight: 3,                // Espessura da borda em pixels.
        opacity: 1,               // Opacidade da borda (1 = totalmente visível).
        color: vendedor.color || '#2196F3', // Cor da borda. Usa a cor do vendedor ou um padrão.
        dashArray: null           // Linha contínua (sem tracejado).
    };
}

function setupFeaturePopupForVendedorLayer(feature, mapFeature, vendedor) {
    const municipalityCode = feature.properties.GEOCODIGO || feature.properties.CD_MUN || feature.properties.cd_geocmu || feature.properties.geocodigo;
    const municipalityName = feature.properties.NOME || feature.properties.NM_MUN || feature.properties.nm_mun || feature.properties.nome || 'Nome não disponível';
    const stateUF = feature.properties.UF || feature.properties.SIGLA_UF || feature.properties.uf;

    let popupContent = `<strong>${municipalityName}</strong>`;
    if (stateUF) {
        popupContent += ` (${stateUF})`;
    }
    popupContent += `<br>`;

    popupContent += `
        Vendedor: ${vendedor.name}<br>
        Território de Atuação<br>
        Código: ${municipalityCode}
    `;

    mapFeature.bindPopup(popupContent);
}


function clearAllVendedorLayers() {
    vendedorLayers.forEach(item => {
        if (item.layer) {
            map.removeLayer(item.layer);
        }
    });
    vendedorLayers = [];

    if (currentVendedorLayer) {
        map.removeLayer(currentVendedorLayer);
        currentVendedorLayer = null;
    }
}

function clearVendedorTerritory() {
    clearAllVendedorLayers();

    selectedVendedores = [];

    updateVendedoresPanelSelection();

    const clearBtn = document.querySelector('#clear-vendedor-territory');
    if (clearBtn) {
        clearBtn.disabled = true;
        clearBtn.innerHTML = '<i class="fas fa-eraser"></i> Limpar Território';
    }

    resetMapView();

    console.log('Todos os territórios de vendedores removidos');
}

// Export functions for global use
window.initializeMap = initializeMap;
window.loadCropLayer = loadCropLayer;
window.filterByStateOnMap = filterByStateOnMap;
window.toggleRadiusMode = toggleRadiusMode;
window.clearRadius = clearRadius;
window.testMapVisibility = testMapVisibility;
window.removeAnalyticsCard = removeAnalyticsCard;
window.hideAnalyticsCard = hideAnalyticsCard;
window.showAnalyticsCard = showAnalyticsCard;
window.clearAllAnalyticsCards = clearAllAnalyticsCards;
window.showRevendaTerritory = showRevendaTerritory; // Keep for backward compatibility

// Helper function for generic layer coloring, using a specified base color
function getColorForValueWithColor(value, min, max, baseColor) {
    // Ensure value is at least 1 for logarithmic scale if it's 0 or less
    if (value <= 0) value = 1;

    // Adjust min and max for better logarithmic distribution
    const adjustedMin = Math.max(min, 1);
    const adjustedMax = Math.max(max, adjustedMin * 10); // Ensure max is significantly larger than min

    // Use logarithmic scale for normalization
    const logMin = Math.log(adjustedMin);
    const logMax = Math.log(adjustedMax);
    const logValue = Math.log(Math.max(value, adjustedMin)); // Ensure value is within log range
    const normalized = (logValue - logMin) / (logMax - logMin);

    // Generate sequential color based on the selected base color
    return generateSequentialColor(normalized, baseColor);
}

// Function to update the combined legend for all visible layers
function updateCombinedLegend() {
            // Remove existing legend
            if (window.currentLegendControl) {
                map.removeControl(window.currentLegendControl);
                window.currentLegendControl = null;
            }

            // Get only visible layers from the global active layers array
            const visibleLayers = window.activeLayers ? 
                window.activeLayers.filter(layer => layer.visible !== false && layer.mapLayer) : 
                [];

            // If no visible layers, do not show legend
            if (visibleLayers.length === 0) {
                console.log('Nenhuma camada visível - legenda removida');
                return;
            }

            console.log(`Atualizando legenda para ${visibleLayers.length} camadas visíveis`);

            window.currentLegendControl = L.control({ position: 'bottomright' });
            window.currentLegendControl.onAdd = function(map) {
                const div = L.DomUtil.create('div', 'map-legend');

                let legendHTML = `<h6><i class="fas fa-layer-group"></i> Camadas Ativas</h6>`;

                visibleLayers.forEach(layer => {
                    // Use layer-specific min/max or default values
                    const { min, max } = layer.minMax || { min: 1, max: 1000 };
                    const adjustedMin = Math.max(min, 1);
                    const adjustedMax = Math.max(max, adjustedMin * 10);

                    legendHTML += `<div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">`;
                    legendHTML += `<div style="font-size: 12px; font-weight: 600; margin-bottom: 5px;">${layer.name}</div>`;
                    // Display unit if available
                    legendHTML += `<div style="font-size: 10px; margin-bottom: 5px;">${layer.unit || 'Valor'}</div>`;

                    // Create color scale for the current layer
                    const steps = 4; // Number of color steps in the legend
                    for (let i = 0; i < steps; i++) {
                        let value;
                        if (i === 0) {
                            value = adjustedMin; // Minimum value
                        } else if (i === steps - 1) {
                            value = adjustedMax; // Maximum value
                        } else {
                            // Distribute values logarithmically between min and max
                            const logMin = Math.log(adjustedMin);
                            const logMax = Math.log(adjustedMax);
                            const logValue = logMin + (logMax - logMin) * (i / (steps - 1));
                            value = Math.exp(logValue);
                        }

                        // Get color based on the value and layer's base color
                        const color = getColorForValueWithColor(value, adjustedMin, adjustedMax, layer.color);
                        // Format displayed value for readability (e.g., '1.2k' for thousands)
                        const displayValue = value < 1000 ?
                            value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) :
                            (value / 1000).toLocaleString('pt-BR', {maximumFractionDigits: 1}) + 'k';

                        legendHTML += `
                            <div class="legend-item">
                                <div class="legend-color" style="background-color: ${color}; width: 15px; height: 15px; display: inline-block; margin-right: 5px; border: 1px solid #ccc;"></div>
                                <span style="font-size: 9px;">${displayValue} ${layer.unit || ''}</span>
                            </div>
                        `;
                    }
                    legendHTML += `</div>`;
                });

                // Add a "No data" entry to the legend
                legendHTML += `
                    <div class="legend-item mt-2" style="font-size: 10px; color: #666;">
                        <div class="legend-color" style="background-color: #E8E8E8; width: 15px; height: 15px; display: inline-block; margin-right: 5px; border: 1px solid #ccc;"></div>
                        <span style="font-size: 9px;">Sem dados</span>
                    </div>
                `;

                div.innerHTML = legendHTML;
                return div;
            };
            window.currentLegendControl.addTo(map);
        }

// Function to load municipality boundaries for a generic layer
async function loadMunicipalityBoundariesForGenericLayer(layer, layerData, minMax) {
    const geoJsonFiles = [
        '/static/data/brazil_municipalities_all.geojson',
        '/attached_assets/brazil_municipalities_all_1752980285489.geojson',
        '/static/data/brazil_municipalities_combined.geojson',
        '/static/data/br_municipalities_simplified.geojson'
    ];

    for (const filePath of geoJsonFiles) {
        try {
            console.log(`Tentando carregar: ${filePath}`);
            const response = await fetch(filePath);
            if (response.ok) {
                const geoData = await response.json();
                console.log(`GeoJSON carregado com sucesso: ${filePath}, ${geoData.features.length} municípios`);

                // Apply state filter if one is selected (only for non-revenda layers)
                const filteredData = layer.type !== 'revendas' ? applyStateFilterForLayer(geoData, layer.state) : geoData;

                // Create the GeoJSON layer
                const mapLayer = L.geoJSON(filteredData, {
                    style: function(feature) {
                        return getFeatureStyleForLayer(feature, layer);
                    },
                    onEachFeature: function(feature, mapFeature) {
                        setupFeaturePopupForLayer(feature, mapFeature, layer);
                    }
                });

                layer.mapLayer = mapLayer;
                layer.minMax = minMax;
                layer.data = layerData;

                // Add to map if the layer is set to be visible
                if (layer.visible !== false) {
                    mapLayer.addTo(map);
                }

                // Update the combined legend
                updateCombinedLegend();
                break; // Exit loop once a GeoJSON file is successfully loaded
            }
        } catch (error) {
            console.log(`Erro ao carregar ${filePath}:`, error);
            continue; // Try the next file if current one fails
        }
    }
}

// Function to get feature style for a generic layer
function getFeatureStyleForLayer(feature, layer) {
    // Retrieve municipality code from feature properties using common keys
    const municipalityCode = feature.properties.GEOCODIGO ||
                           feature.properties.CD_MUN ||
                           feature.properties.cd_geocmu ||
                           feature.properties.geocodigo ||
                           feature.properties.CD_GEOCMU;

    const layerData = layer.data[municipalityCode]; // Get data for this municipality from the layer's data

    // If no data or data value is zero/null, use default "no data" style
    if (!layerData || !layerData[layer.dataColumn] || layerData[layer.dataColumn] === 0) {
        // Default style for municipalities without data
        return {
            fillColor: '#E8E8E8', // Light grey fill
            weight: 0.3,          // Thin border
            opacity: 0.8,         // Border opacity
            color: '#CCCCCC',     // Grey border color
            fillOpacity: 0.6 * mapOpacity // Fill opacity adjusted by global map opacity
        };
    }

    const value = layerData[layer.dataColumn]; // Get the specific data value
    // Determine the color based on the value, min/max, and layer's base color
    const color = getColorForValueWithColor(value, layer.minMax.min, layer.minMax.max, layer.color);

    // Style for municipalities with data
    return {
        fillColor: color,         // Calculated color
        weight: 0.3,              // Thin border
        opacity: 0.8,             // Border opacity
        color: '#666666',         // Dark grey border color
        fillOpacity: 0.7 * mapOpacity // Fill opacity adjusted by global map opacity
    };
}

// Function to set up popups for features of a generic layer
function setupFeaturePopupForLayer(feature, layerFeature, layer) {
    // Retrieve municipality info from feature properties
    const municipalityCode = feature.properties.GEOCODIGO || feature.properties.CD_MUN || feature.properties.cd_geocmu || feature.properties.geocodigo;
    const municipalityName = feature.properties.NOME || feature.properties.NM_MUN || feature.properties.nm_mun || feature.properties.nome || 'Nome não disponível';
    const stateUF = feature.properties.UF || feature.properties.SIGLA_UF || feature.properties.uf;
    const layerData = layer.data[municipalityCode]; // Get data for this municipality

    let popupContent = `<strong>${municipalityName}</strong>`;
    if (stateUF) {
        popupContent += ` (${stateUF})`; // Add state if available
    }
    popupContent += `<br>`;

    // Add layer-specific data to the popup
    if (layerData) {
         const value = layerData[layer.dataColumn];
                const unit = layer.unit || ''; // Get unit from layer, default to empty string

        popupContent += `
            ${layer.name}: ${value.toLocaleString('pt-BR')} ${unit}<br>
            Código: ${municipalityCode}
        `;
    } else {
        // Display "No data" if data is missing
        popupContent += `
            ${layer.name}: <em>Dados não disponíveis</em><br>
            Código: ${municipalityCode || 'N/A'}
        `;
    }

    layerFeature.bindPopup(popupContent); // Bind the generated content to the Leaflet feature
}

// Function to handle loading different types of layers
function loadLayerByType(layer) {
    switch (layer.type) {
        case 'receitas':
            loadReceitasLayerForLayer(layer);
            break;
        case 'revendas':
            loadRevendasLayerForLayer(layer); // Call the specific handler for revendas
            break;
        default:
            console.error('Tipo de camada não suportado:', layer.type);
    }
}

// Handler for loading "receitas" layers
async function loadReceitasLayerForLayer(layer) {
            try {
                console.log(`Loading receitas layer for layer: ${layer.name}`);

                // Fetch data from the API endpoint for receitas
                const response = await fetch(`/api/receita/${encodeURIComponent(layer.category)}`);
                const data = await response.json();

                if (data.success) {
                    const receitasData = data.data;
                    layer.data = receitasData; // Store the fetched data in the layer object
                    layer.dataColumn = 'value'; // Assuming 'value' is the data column for receitas

                    // Calculate min/max values for the legend scale
                    const values = Object.values(receitasData)
                        .map(item => item.value || item.harvested_area || 0) // Use 'value' or 'harvested_area'
                        .filter(value => value > 0); // Filter out zero or negative values

                    let minMax = { min: 0, max: 1000 }; // Default min/max
                    if (values.length > 0) {
                        minMax.min = Math.min(...values);
                        minMax.max = Math.max(...values);
                    }

                    layer.minMax = minMax; // Store calculated min/max
                    await loadMunicipalityBoundariesForGenericLayer(layer, receitasData, minMax); // Load GeoJSON and create layer
                    showAnalyticsCard(layer); // Display analytics card for the layer
                } else {
                    console.error('Error loading receitas data:', data.error);
                    alert('Erro ao carregar dados de receitas: ' + data.error);
                }
            } catch (error) {
                console.error('Network error:', error);
                alert('Erro de conexão ao carregar dados de receitas');
            }
        }

        // Handler for loading "revendas" layers
        async function loadRevendasLayerForLayer(layer) {
            try {
                console.log(`Loading revendas layer for layer: ${layer.name}`);

                // Get territory data from API using the revenda ID
                const response = await fetch(`/api/revendas/data/${layer.revendaId}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.error || 'Erro ao carregar dados da revenda');
                }

                const revendasData = data.data; // The actual territory data for the revenda
                console.log('Revenda data loaded:', revendasData);

                layer.data = revendasData; // Store the loaded data
                layer.dataColumn = 'value'; // Use 'value' column for revendas, set to 1 for territory visualization

                // For revendas, use a fixed min/max for coloring (all territories are visually the same)
                const minMax = { min: 1, max: 1 };
                layer.minMax = minMax;

                await loadMunicipalityBoundariesForRevendasLayer(layer, revendasData, minMax); // Load GeoJSON and create revenda layer
                showAnalyticsCard(layer); // Display analytics card
            } catch (error) {
                console.error('Error loading revenda layer:', error);
                alert('Erro ao carregar dados de revendas: ' + error.message);
            }
        }

// Initialize global layer management if it doesn't exist
if (!window.activeLayers) {
    window.activeLayers = [];
}

// Export utility functions for global access
window.loadMunicipalityBoundariesForGenericLayer = loadMunicipalityBoundariesForGenericLayer;
window.loadLayerByType = loadLayerByType;

// Add function to close revenda panel
function closeRevendasPanel() {
    if (revendasPanel) {
        map.removeControl(revendasPanel);
        revendasPanel = null;
    }
}

// Add function to close vendedor panel
function closeVendedoresPanel() {
    if (vendedoresPanel) {
        map.removeControl(vendedoresPanel);
        vendedoresPanel = null;
    }
}