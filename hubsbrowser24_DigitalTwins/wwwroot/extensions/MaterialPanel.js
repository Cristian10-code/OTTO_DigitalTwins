const DATAGRID_CONFIG = {
    requiredProps: ['Structural Material', 'Volume', 'Width', 'Length', 'Foundation Thickness'],
    columns: [
        { title: 'Structural Material', field: 'material', width: 150, headerSort: false },
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
            const colors = this.generateColors(materials.length);

            materials.forEach((material, index) => {
                const color = `rgb(${colors[index].r}, ${colors[index].g}, ${colors[index].b})`;
                groupedData[material].color = color;
                groupedData[material].dbids.forEach(dbId => {
                    this.viewer.setThemingColor(dbId, new THREE.Vector4(colors[index].r / 255, colors[index].g / 255, colors[index].b / 255, 1));
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

    generateColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            const hue = (i * 360) / count;
            colors.push(this.hsvToRgb(hue, 100, 100));
        }
        return colors;
    }

    hsvToRgb(h, s, v) {
        let r, g, b;
        const i = Math.floor(h / 60);
        const f = h / 60 - i;
        const p = v * (1 - s / 100);
        const q = v * (1 - f * s / 100);
        const t = v * (1 - (1 - f) * s / 100);
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
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
