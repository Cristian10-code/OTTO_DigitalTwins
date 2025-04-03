const DATAGRID_CONFIG = {
    requiredProps: ['Category', 'Assembly Code', 'Structural Material', 'Material', 'Volume', 'Width', 'Length', 'Foundation Thickness', 'Type Name', 'Description', 'Model'],
    columns: [
        { title: 'Assembly Code', field: 'assemblyCode', width: 150, headerSort: true },
        { title: 'Material / Type', field: 'materialOrType', width: 250, headerSort: true },
        {
            title: 'Quantity',
            field: 'quantity',
            hozAlign: 'center',
            formatter: (cell) => {
                const value = cell.getValue();
                return `<div style="text-align: center;">${value}</div>`;
            }
        }
        // Las columnas de volumen, área y longitud se agregarán dinámicamente si se encuentran
    ],
    groupBy: ['category', 'assemblyCode'],
    createRow: (category, assemblyCode, materialOrType, quantity, volume, area, length, dbids, color) => ({
        category,
        assemblyCode,
        materialOrType,
        quantity,
        volume,
        area,
        length,
        dbids,
        color
    }),
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
            initialSort: [{ column: 'category', dir: 'asc' }, { column: 'assemblyCode', dir: 'asc' }],
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
            let hasVolume = false;
            let hasArea = false;
            let hasLength = false;

            results.forEach((result) => {
                const categoryProp = result.properties.find(p => p.displayName === 'Category');
                const assemblyProp = result.properties.find(p => p.displayName === 'Assembly Code');
                let materialProp = result.properties.find(p => p.displayName === 'Structural Material') || result.properties.find(p => p.displayName === 'Material');
                const volumeProp = result.properties.find(p => p.displayName === 'Volume');
                const widthProp = result.properties.find(p => p.displayName === 'Width');
                const lengthProp = result.properties.find(p => p.displayName === 'Length');
                const thicknessProp = result.properties.find(p => p.displayName === 'Foundation Thickness');
                const typeNameProp = result.properties.find(p => p.displayName === 'Type Name');
                const descriptionProp = result.properties.find(p => p.displayName === 'Description');
                const modelProp = result.properties.find(p => p.displayName === 'Model');

                // Si no se encuentra la propiedad de material, utilizar Type Name o Description o Model
                if (!materialProp) {
                    console.warn(`Elemento ${result.dbId} no tiene propiedad 'Structural Material' ni 'Material'. Usando nombre de tipo.`);
                    materialProp = typeNameProp || descriptionProp || modelProp || { displayValue: 'Unknown' };
                }

                let volume = 0;
                let area = 0;
                let length = 0;
                let hasLengthProp = false;

                if (volumeProp) {
                    volume = parseFloat(volumeProp.displayValue || 0);
                    hasVolume = true;
                } else if (widthProp && lengthProp && thicknessProp) {
                    const width = parseFloat(widthProp.displayValue || 0);
                    const len = parseFloat(lengthProp.displayValue || 0);
                    const thickness = parseFloat(thicknessProp.displayValue || 0);
                    volume = width * len * thickness;
                    hasVolume = true;
                }

                // Calcular área (considerando la cara superior)
                if (widthProp && lengthProp) {
                    const width = parseFloat(widthProp.displayValue || 0);
                    const len = parseFloat(lengthProp.displayValue || 0);
                    area = width * len;
                    hasArea = true;
                } else if (volumeProp && thicknessProp) {
                    const thickness = parseFloat(thicknessProp.displayValue || 0);
                    if (thickness > 0) {
                        area = volume / thickness;
                        hasArea = true;
                    }
                }

                // Calcular longitud
                if (lengthProp) {
                    length = parseFloat(lengthProp.displayValue || 0);
                    hasLength = true;
                    hasLengthProp = true;
                }

                const category = categoryProp ? (categoryProp.displayValue || 'Unknown') : 'Unknown';
                const assemblyCode = assemblyProp ? (assemblyProp.displayValue || 'Unknown') : 'Unknown';
                const materialOrType = materialProp.displayValue || 'Unknown';
                const key = `${category}_${assemblyCode}_${materialOrType}`;

                if (!groupedData[key]) {
                    groupedData[key] = {
                        category,
                        assemblyCode,
                        materialOrType,
                        quantity: 0,
                        volume: 0,
                        area: 0,
                        length: 0,
                        dbids: [],
                        color: ''
                    };
                }

                groupedData[key].quantity += 1;
                groupedData[key].volume += volume;
                groupedData[key].area += area;
                groupedData[key].length += hasLengthProp ? length : 0;
                groupedData[key].dbids.push(result.dbId);
            });

            // Asignar colores únicos por combinación de category, assembly code y material
            const combinations = Object.keys(groupedData);
            const colors = this.generateUniqueColors(combinations);

            combinations.forEach((key, index) => {
                const color = colors[index];
                groupedData[key].color = color;

                // Aplicar colores a los dbIds correspondientes
                groupedData[key].dbids.forEach(dbId => {
                    const [r, g, b] = color.match(/\d+/g).map(Number); // Extraer valores RGB del color
                    this.viewer.setThemingColor(dbId, new THREE.Vector4(r / 255, g / 255, b / 255, 1));
                });
            });

            // Actualizar columnas dinámicamente
            const columns = [
                { title: 'Assembly Code', field: 'assemblyCode', width: 150, headerSort: true },
                { title: 'Material / Type', field: 'materialOrType', width: 250, headerSort: true },
                {
                    title: 'Quantity',
                    field: 'quantity',
                    hozAlign: 'center',
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<div style="text-align: center;">${value}</div>`;
                    }
                }
            ];

            if (hasVolume) {
                columns.push({
                    title: 'Volume',
                    field: 'volume',
                    hozAlign: 'center',
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<div style="text-align: center;">${value.toFixed(2)} m³</div>`;
                    }
                });
            }

            if (hasArea) {
                columns.push({
                    title: 'Area',
                    field: 'area',
                    hozAlign: 'center',
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<div style="text-align: center;">${value.toFixed(2)} m²</div>`;
                    }
                });
            }

            if (hasLength) {
                columns.push({
                    title: 'Length',
                    field: 'length',
                    hozAlign: 'center',
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<div style="text-align: center;">${value.toFixed(2)} m</div>`;
                    }
                });
            }

            columns.push({
                title: 'Color',
                field: 'color',
                hozAlign: 'center',
                formatter: (cell) => {
                    const color = cell.getValue();
                    return `<div style="width: 20px; height: 20px; background-color: ${color}; margin: 0 auto; border-radius: 50%;"></div>`;
                }
            });

            this.table.setColumns(columns);

            const tableData = Object.values(groupedData).map(data =>
                DATAGRID_CONFIG.createRow(
                    data.category,
                    data.assemblyCode,
                    data.materialOrType,
                    data.quantity,
                    data.volume,
                    data.area,
                    data.length,
                    data.dbids,
                    data.color
                )
            );

            this.table.replaceData(tableData);
            this.viewer.impl.sceneUpdated(true);
        }, (err) => {
            console.error('Error al obtener propiedades:', err);
        });
    }

    generateUniqueColors(combinations) {
        const colors = [];
        const totalCombinations = combinations.length;

        combinations.forEach((key, index) => {
            if (!this.materialColorMap.has(key)) {
                // Calcular un hue único basado en el índice
                const hue = (index * 360) / totalCombinations; // Distribuir colores uniformemente en 360 grados
                const color = this.hsvToRgb(hue, 80, 90); // Saturación y brillo ajustados para colores vibrantes
                const rgbColor = `rgb(${color.r}, ${color.g}, ${color.b})`;

                this.materialColorMap.set(key, rgbColor); // Asignar color único a la combinación
            }

            colors.push(this.materialColorMap.get(key)); // Recuperar el color asignado
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