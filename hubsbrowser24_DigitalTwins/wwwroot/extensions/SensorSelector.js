export class SensorSelector {
    constructor() {
        this.initDropdown();
    }

    // Inicializar el dropdown para seleccionar sensores
    initDropdown() {
        const dropdown = document.createElement('select');
        dropdown.id = 'sensor-select';
        dropdown.style.margin = '10px';
        dropdown.innerHTML = `
            <option value="">-- Select a Sensor --</option>
            <option value="1">Sensor 1</option>
            <option value="2">Sensor 2</option>
            <option value="3">Sensor 3</option>
        `;

        // Agregar el dropdown al DOM
        const toolbar = document.getElementById('toolbar');
        if (toolbar) {
            toolbar.appendChild(dropdown);
        } else {
            console.warn('No se encontró el elemento con ID "toolbar".');
        }

        // Event listener para manejar la selección de sensores
        dropdown.addEventListener('change', (event) => {
            const selectedSensorId = event.target.value;

            // Obtener la extensión `SensorChartsExtension` y comunicar el sensor seleccionado
            const sensorChartsExtension = Autodesk.Viewing.theExtensionManager.getExtension('SensorChartsExtension');
            if (sensorChartsExtension) {
                sensorChartsExtension.selectSensor(selectedSensorId || null);
            } else {
                console.warn('SensorChartsExtension no está cargada.');
            }
        });
    }
}

// Inicializar el selector de sensores al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    new SensorSelector();
});
