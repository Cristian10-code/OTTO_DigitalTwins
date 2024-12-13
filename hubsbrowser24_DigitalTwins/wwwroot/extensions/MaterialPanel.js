const DATAGRID_CONFIG = {
    requiredProps: ['Structural Material', 'Volume', 'Width', 'Length', 'Foundation Thickness'],
    columns: [
        { title: 'Structural Material', field: 'material', width: 300, headerSort: false },
        {
            title: 'Volume',
            field: 'volume',
            hozAlign: 'center',
            formatter: (cell) => {
                const value = cell.getValue();
                return `<div style="text-align: center;">${value.toFixed(2)} m³</div>`;
            }
        },
        {
            title: 'Color',
            field: 'color',
            hozAlign: 'center',
            formatter: (cell) => {
                const color = cell.getValue();
                return `<div style="width: 20px; height: 20px; background-color: ${color}; margin: 0 auto; border-radius: 50%;"></div>`;
            }
        }
    ],
    groupBy: ['material'],
    createRow: (material, volume, dbids, color) => ({ material, volume, dbids, color }),
    onRowClick: (row, viewer) => {
        viewer.clearSelection();
        viewer.isolate(row.dbids);
        viewer.fitToView(row.dbids);
    }
};

export class MaterialPanel {
    constructor(viewer) {
        this.viewer = viewer;
        this.table = null;
        this.container = null;
        this.materialColorMap = new Map(); // Mapa global para rastrear colores de materiales
        this.colorIndex = 0; // Índice para generar colores únicos
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with id '${containerId}' not found.`);
            return;
        }

        this.container.innerHTML = `
            <div class="material-table-container" style="position: relative; height: 100%;"></div>
        `;

        this.table = new Tabulator('.material-table-container', {
            height: '100%',
            layout: 'fitColumns',
            columns: DATAGRID_CONFIG.columns,
            groupBy: DATAGRID_CONFIG.groupBy,
            initialSort: [{ column: 'volume', dir: 'desc' }],
            rowClick: (e, row) => DATAGRID_CONFIG.onRowClick(row.getData(), this.viewer)
        });
    }

    update(model, dbids) {
        if (!this.container) {
            console.error('MaterialPanel no ha sido inicializado correctamente.');
            return;
        }

        // Limpiar colores existentes antes de aplicar nuevos
        this.viewer.clearThemingColors();

        model.getBulkProperties(dbids, DATAGRID_CONFIG.requiredProps, (results) => {
            const groupedData = {};
            let missingVolumeCount = 0;

            results.forEach((result) => {
                const materialProp = result.properties.find(p => p.displayName === 'Structural Material');
                const volumeProp = result.properties.find(p => p.displayName === 'Volume');
                const widthProp = result.properties.find(p => p.displayName === 'Width');
                const lengthProp = result.properties.find(p => p.displayName === 'Length');
                const thicknessProp = result.properties.find(p => p.displayName === 'Foundation Thickness');

                if (!materialProp) {
                    console.warn(`Elemento ${result.dbId} no tiene propiedad 'Structural Material'.`);
                    return;
                }

                let volume = 0;
                if (volumeProp) {
                    volume = parseFloat(volumeProp.displayValue || 0);
                } else if (widthProp && lengthProp && thicknessProp) {
                    const width = parseFloat(widthProp.displayValue || 0);
                    const length = parseFloat(lengthProp.displayValue || 0);
                    const thickness = parseFloat(thicknessProp.displayValue || 0);
                    volume = width * length * thickness;
                    missingVolumeCount++;
                } else {
                    console.warn(`Elemento ${result.dbId} no tiene suficiente información para calcular el volumen.`);
                    return;
                }

                const material = materialProp.displayValue || 'Unknown';

                if (!groupedData[material]) {
                    groupedData[material] = { material, volume: 0, dbids: [], color: '' };
                }

                groupedData[material].volume += volume;
                groupedData[material].dbids.push(result.dbId);
            });

            console.warn(`Número de elementos con volumen calculado: ${missingVolumeCount}`);

            const materials = Object.keys(groupedData);
            const colors = this.generateUniqueColors(materials);

            materials.forEach((material, index) => {
                const color = colors[index];
                groupedData[material].color = color;

                // Aplicar colores a los dbIds correspondientes
                groupedData[material].dbids.forEach(dbId => {
                    const [r, g, b] = color.match(/\d+/g).map(Number); // Extraer valores RGB del color
                    this.viewer.setThemingColor(dbId, new THREE.Vector4(r / 255, g / 255, b / 255, 1));
                });
            });

            const tableData = Object.values(groupedData).map(data =>
                DATAGRID_CONFIG.createRow(data.material, data.volume, data.dbids, data.color)
            );

            this.table.replaceData(tableData);
            this.viewer.impl.sceneUpdated(true);
        }, (err) => {
            console.error('Error al obtener propiedades:', err);
        });
    }

    generateUniqueColors(materials) {
        const colors = [];
        const totalMaterials = materials.length;

        materials.forEach((material, index) => {
            if (!this.materialColorMap.has(material)) {
                // Calcular un hue único basado en el índice
                const hue = (index * 360) / totalMaterials; // Distribuir colores uniformemente en 360 grados
                const color = this.hsvToRgb(hue, 80, 90); // Saturación y brillo ajustados para colores vibrantes
                const rgbColor = `rgb(${color.r}, ${color.g}, ${color.b})`;

                this.materialColorMap.set(material, rgbColor); // Asignar color único al material
            }

            colors.push(this.materialColorMap.get(material)); // Recuperar el color asignado
        });

        return colors;
    }

    hsvToRgb(h, s, v) {
        s /= 100;
        v /= 100;

        let r, g, b;

        const i = Math.floor(h / 60) % 6;
        const f = h / 60 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        switch (i) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    setVisible(visible) {
        if (this.container) {
            this.container.style.display = visible ? 'block' : 'none';
        }
    }

    isVisible() {
        return this.container && this.container.style.display === 'block';
    }
}
