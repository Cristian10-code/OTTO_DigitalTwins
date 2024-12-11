import { BaseExtension } from './BaseExtension.js';

class SensorChartsExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._chartsPanel = null; // Panel para los datos y gráficos
        this.temperatureChart = null; // Gráfico de temperatura
        this.co2Chart = null; // Gráfico de CO2
        this.humidityChart = null; // Gráfico de humedad
    }

    async load() {
        super.load();
        console.log('SensorChartsExtension loaded');

        // Cargar la librería Chart.js
        await this.loadScript('https://cdn.jsdelivr.net/npm/chart.js', 'Chart');

        // Crear el panel unificado
        this.createChartsPanel();

        // Actualizar los datos periódicamente
        setInterval(() => {
            this.updateSensorData();
        }, 2000);

        return true;
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

        // Verificar si ya existe un gráfico en el canvas y destruirlo
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

        // Asocia el gráfico al canvas para futuras referencias
        canvas.chartInstance = chart;

        return chart;
    }





    updateSensorData() {
        const now = new Date(); // Hora actual como objeto Date

        // Generar datos aleatorios
        const temperature = Math.random() * 30 + 10; // Temperatura
        const co2 = Math.random() * 1000 + 300; // CO2
        const humidity = Math.random() * 100; // Humedad

        // Agregar datos y actualizar gráficos
        this.addDataToChart(this.temperatureChart, now, temperature);
        this.addDataToChart(this.co2Chart, now, co2);
        this.addDataToChart(this.humidityChart, now, humidity);

        // Actualizar estado del sensor
        document.getElementById('sensor-status').textContent =
            `Last update: Temperature: ${temperature.toFixed(2)}°C, CO2: ${co2.toFixed(2)} ppm, Humidity: ${humidity.toFixed(2)} %`;
    }

    addDataToChart(chart, label, value) {
        chart.data.labels.push(label); // Etiqueta de tiempo
        chart.data.datasets[0].data.push(value); // Valor

        // Limitar a 30 puntos
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
