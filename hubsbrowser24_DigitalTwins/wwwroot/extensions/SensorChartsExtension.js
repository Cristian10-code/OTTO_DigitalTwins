import { BaseExtension } from './BaseExtension.js';
import { SensorDataClient } from './SensorDataClient.js';

class SensorChartsExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._chartsPanel = null; // Panel para los datos y gráficos
        this.temperatureChart = null; // Gráfico de temperatura
        this.co2Chart = null; // Gráfico de CO2
        this.humidityChart = null; // Gráfico de humedad
        this.selectedSensorId = null; // Sensor actualmente seleccionado
    }

    async load() {
        super.load();
        console.log('SensorChartsExtension loaded');

        // Suscribirse al evento de selección de elementos
        this.viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, (event) => {
            this.onElementSelected(event);
        });

        // Cargar la librería Chart.js
        await this.loadScript('https://cdn.jsdelivr.net/npm/chart.js', 'Chart');

        // Crear el panel de gráficas
        this.createChartsPanel();

        // Actualizar los datos periódicamente
        setInterval(() => {
            this.updateSensorData();
        }, 2000);

        return true;
    }

    onElementSelected(event) {
        const dbIds = event.dbIdArray; // Lista de elementos seleccionados
        if (dbIds.length === 0) {
            this.selectedSensorId = null;
            this.clearCharts();
            document.getElementById('sensor-status').textContent = "No element selected.";
            return;
        }

        const selectedDbId = dbIds[0]; // Seleccionar el primer elemento
        console.log(`Elemento seleccionado: ${selectedDbId}`);

        const sensorData = SensorDataClient.getSensorData(selectedDbId);
        if (!sensorData || sensorData.length === 0) {
            console.warn(`El elemento seleccionado no tiene datos de sensores: ${selectedDbId}`);
            this.selectedSensorId = null;
            this.clearCharts();
            document.getElementById('sensor-status').textContent = `No sensor data for element ${selectedDbId}`;
        } else {
            this.selectedSensorId = selectedDbId;
            this.updateSensorData();
        }
    }




    unload() {
        super.unload();

        // Destruir gráficos existentes
        if (this.temperatureChart) {
            this.temperatureChart.destroy();
            this.temperatureChart = null;
        }
        if (this.co2Chart) {
            this.co2Chart.destroy();
            this.co2Chart = null;
        }
        if (this.humidityChart) {
            this.humidityChart.destroy();
            this.humidityChart = null;
        }

        // Destruir el panel si existe
        if (this._chartsPanel) {
            this._chartsPanel.setVisible(false);
            this._chartsPanel.uninitialize();
            this._chartsPanel = null;
        }

        console.log('SensorChartsExtension unloaded');
        return true;
    }



    createChartsPanel() {
        if (this._chartsPanel) {
            console.log('Panel already exists');
            return;
        }

        this._chartsPanel = new Autodesk.Viewing.UI.DockingPanel(this.viewer.container, 'sensor-charts-panel', 'Sensor Data & Charts');
        this._chartsPanel.container.style.top = '48px';
        this._chartsPanel.container.style.right = '0px';
        this._chartsPanel.container.style.width = '500px';
        this._chartsPanel.container.style.height = '100vh';
        this._chartsPanel.container.style.backgroundColor = '#1e1e1e';
        this._chartsPanel.container.style.color = 'white';
        this._chartsPanel.container.style.overflow = 'hidden';
        this._chartsPanel.container.style.padding = '10px';

        this._chartsPanel.container.innerHTML = `
        <div style="height: 10%; text-align: center;">
            <p id="sensor-status">Last update: Temperature: -- °C, CO2: -- ppm, Humidity: -- %</p>
        </div>
        <div class="chart-container" style="height: 30%; margin-bottom: 10px;">
            <h5 style="text-align: center;">Temperature [°C]</h5>
            <canvas id="temperature-chart"></canvas>
        </div>
        <div class="chart-container" style="height: 30%; margin-bottom: 10px;">
            <h5 style="text-align: center;">CO2 Levels [ppm]</h5>
            <canvas id="co2-chart"></canvas>
        </div>
        <div class="chart-container" style="height: 30%;">
            <h5 style="text-align: center;">Humidity [%]</h5>
            <canvas id="humidity-chart"></canvas>
        </div>
    `;

        this.viewer.container.appendChild(this._chartsPanel.container);

        // Crear gráficos solo si no existen
        if (!this.temperatureChart) {
            this.temperatureChart = this.createChart('temperature-chart', 'Temperature [°C]', 'rgba(255, 99, 132, 1)', 'rgba(255, 99, 132, 0.2)');
        }
        if (!this.co2Chart) {
            this.co2Chart = this.createChart('co2-chart', 'CO2 Levels [ppm]', 'rgba(54, 162, 235, 1)', 'rgba(54, 162, 235, 0.2)');
        }
        if (!this.humidityChart) {
            this.humidityChart = this.createChart('humidity-chart', 'Humidity [%]', 'rgba(75, 192, 192, 1)', 'rgba(75, 192, 192, 0.2)');
        }
    }



    createChart(canvasId, label, borderColor, backgroundColor) {
        const canvas = document.getElementById(canvasId);

        if (canvas.chartInstance) {
            canvas.chartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [], // Etiquetas de tiempo
                datasets: [{
                    label: label,
                    borderColor: borderColor,
                    backgroundColor: backgroundColor,
                    fill: true,
                    data: [] // Datos
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'second',
                            displayFormats: {
                                second: 'h:mm:ss a'
                            },
                            tooltipFormat: 'h:mm:ss a'
                        },
                        ticks: {
                            autoSkip: true,
                            maxRotation: 0
                        }
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        canvas.chartInstance = chart;

        return chart;
    }



    // Método para seleccionar un sensor
    selectSensor(sensorId) {
        this.selectedSensorId = sensorId;
        console.log(`Sensor seleccionado: ${sensorId}`);

        // Actualizar gráficos al seleccionar un sensor
        this.updateSensorData();
    }


    updateSensorData() {
        if (!this.selectedSensorId) {
            console.warn("No hay un sensor seleccionado.");
            this.clearCharts();
            document.getElementById('sensor-status').textContent = "No sensor selected.";
            return;
        }

        // Obtener datos del sensor seleccionado
        const sensorData = SensorDataClient.getSensorData(this.selectedSensorId);

        if (!sensorData) {
            console.warn(`No se encontraron datos para el sensor con ID: ${this.selectedSensorId}`);
            this.clearCharts();
            document.getElementById('sensor-status').textContent = `No data for sensor ${this.selectedSensorId}`;
            return;
        }

        const now = new Date();

        // Añadir datos a las gráficas
        if (sensorData.temperature !== null) this.addDataToChart(this.temperatureChart, now, sensorData.temperature);
        if (sensorData.co2 !== null) this.addDataToChart(this.co2Chart, now, sensorData.co2);
        if (sensorData.humidity !== null) this.addDataToChart(this.humidityChart, now, sensorData.humidity);

        // Actualizar el estado del sensor
        document.getElementById('sensor-status').textContent =
            `Element ${this.selectedSensorId}: Temp: ${sensorData.temperature}°C, CO2: ${sensorData.co2} ppm, Hum: ${sensorData.humidity}%`;
    }



    clearCharts() {
        this.temperatureChart.data.labels = [];
        this.temperatureChart.data.datasets[0].data = [];
        this.temperatureChart.update();

        this.co2Chart.data.labels = [];
        this.co2Chart.data.datasets[0].data = [];
        this.co2Chart.update();

        this.humidityChart.data.labels = [];
        this.humidityChart.data.datasets[0].data = [];
        this.humidityChart.update();
    }


    addDataToChart(chart, label, value) {
        chart.data.labels.push(label);
        chart.data.datasets[0].data.push(value);

        // Limitar los datos a los últimos 30 puntos
        if (chart.data.labels.length > 30) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }

        chart.update();
    }


    async loadScript(url, libraryName) {
        if (!window[libraryName]) {
            const script = document.createElement('script');
            script.src = url;
            document.head.appendChild(script);
            await new Promise((resolve) => (script.onload = resolve));
        }
    }

}

Autodesk.Viewing.theExtensionManager.registerExtension('SensorChartsExtension', SensorChartsExtension);
