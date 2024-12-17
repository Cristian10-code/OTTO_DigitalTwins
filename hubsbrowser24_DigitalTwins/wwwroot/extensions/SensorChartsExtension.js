//import { BaseExtension } from './BaseExtension.js';
//import { SensorDataClient } from './SensorDataClient.js';

//class SensorChartsExtension extends BaseExtension {
//    constructor(viewer, options) {
//        super(viewer, options);
//        this.temperatureChart = null;
//        this.co2Chart = null;
//        this.humidityChart = null;
//        this.selectedSensorId = null; // ID del sensor seleccionado
//    }

//    async load() {
//        super.load();
//        console.log('SensorChartsExtension loaded');

//        // Suscribirse al evento de selección de elementos
//        this.viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this.onElementSelected.bind(this));

//        // Cargar la librería Chart.js y sus plugins
//        await this.loadScript('https://cdn.jsdelivr.net/npm/chart.js', 'Chart');
//        await this.loadScript('https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns', 'chartjsAdapterDateFns');
//        await this.loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-streaming', 'chartjsPluginStreaming');

//        // Configurar gráficos usando los elementos existentes en el HTML
//        this.configureCharts();

//        return true;
//    }

//    onElementSelected(event) {
//        const dbIds = event.dbIdArray;

//        if (dbIds.length === 0) {
//            /*console.log('No element selected.');*/
//            this.selectedSensorId = null; // Restablecer ID del sensor seleccionado
//            this.clearCharts(); // Limpiar métricas si no hay selección
//            document.getElementById('sensor-status').textContent = "No element selected.";
//            return;
//        }

//        const selectedDbId = dbIds[0];
//        const sensorData = SensorDataClient.getSensorData(selectedDbId);

//        if (!sensorData) {
//            /*console.log(`El elemento seleccionado (${selectedDbId}) no tiene datos del sensor.`);*/
//            this.selectedSensorId = null; // Restablecer ID si el elemento no tiene datos
//            this.clearCharts(); // Limpiar gráficos
//            document.getElementById('sensor-status').textContent = `No sensor data for element ${selectedDbId}`;
//            return;
//        }

//        // Actualizar el ID del sensor seleccionado
//        this.selectedSensorId = selectedDbId;
//        /*console.log(`Sensor seleccionado: ${this.selectedSensorId}`);*/
//    }

//    unload() {
//        super.unload();

//        // Destruir gráficos existentes
//        if (this.temperatureChart) this.temperatureChart.destroy();
//        if (this.co2Chart) this.co2Chart.destroy();
//        if (this.humidityChart) this.humidityChart.destroy();

//        console.log('SensorChartsExtension unloaded');
//        return true;
//    }

//    configureCharts() {
//        // Configurar gráficos utilizando los elementos de HTML existentes
//        this.temperatureChart = this.createStreamingChart('temperature-chart', 'Temperature [°C]', 'rgba(255, 99, 132, 1)', 'rgba(255, 99, 132, 0.2)');
//        this.co2Chart = this.createStreamingChart('co2-chart', 'CO2 Levels [ppm]', 'rgba(54, 162, 235, 1)', 'rgba(54, 162, 235, 0.2)');
//        this.humidityChart = this.createStreamingChart('humidity-chart', 'Humidity [%]', 'rgba(75, 192, 192, 1)', 'rgba(75, 192, 192, 0.2)');
//    }

//    createStreamingChart(canvasId, label, borderColor, backgroundColor) {
//        const ctx = document.getElementById(canvasId).getContext('2d');
//        return new Chart(ctx, {
//            type: 'line',
//            data: {
//                datasets: [{
//                    label: label,
//                    borderColor: borderColor,
//                    backgroundColor: backgroundColor,
//                    fill: true,
//                    data: []
//                }]
//            },
//            options: {
//                responsive: true,
//                maintainAspectRatio: false,
//                scales: {
//                    x: {
//                        type: 'realtime',
//                        realtime: {
//                            duration: 10000, // Mostrar últimos 10 segundos
//                            refresh: 2000, // Actualizar cada 2 segundos
//                            delay: 2000, // Retraso para sincronización
//                            onRefresh: chart => {
//                                this.refreshChart(chart);
//                            }
//                        }
//                    },
//                    y: { beginAtZero: true }
//                },
//                plugins: {
//                    legend: { display: true, position: 'top' }
//                }
//            }
//        });
//    }

//    refreshChart(chart) {
//        if (!this.selectedSensorId) {
//            // Si no hay un sensor seleccionado, no actualizar
//            return;
//        }

//        const sensorData = SensorDataClient.getSensorData(this.selectedSensorId);
//        const now = Date.now();

//        if (sensorData) {
//            const value = chart.canvas.id.includes('temperature') ? sensorData.temperature
//                : chart.canvas.id.includes('co2') ? sensorData.co2
//                    : sensorData.humidity;

//            chart.data.datasets[0].data.push({ x: now, y: value });

//            document.getElementById('sensor-status').textContent =
//                `Sensor ${this.selectedSensorId}: Temp: ${sensorData.temperature}°C, CO2: ${sensorData.co2} ppm, Humidity: ${sensorData.humidity}%`;
//        }
//    }

//    clearCharts() {
//        // Limpiar métricas en todos los gráficos
//        if (this.temperatureChart) this.temperatureChart.data.datasets[0].data = [];
//        if (this.co2Chart) this.co2Chart.data.datasets[0].data = [];
//        if (this.humidityChart) this.humidityChart.data.datasets[0].data = [];

//        this.temperatureChart?.update();
//        this.co2Chart?.update();
//        this.humidityChart?.update();
//    }

//    async loadScript(url, libraryName) {
//        if (!window[libraryName]) {
//            const script = document.createElement('script');
//            script.src = url;
//            document.head.appendChild(script);
//            await new Promise(resolve => (script.onload = resolve));
//        }
//    }
//}

//Autodesk.Viewing.theExtensionManager.registerExtension('SensorChartsExtension', SensorChartsExtension);
