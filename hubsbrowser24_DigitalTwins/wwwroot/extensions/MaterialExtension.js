import { BaseExtension } from './BaseExtension.js';
import { MaterialPanel } from './MaterialPanel.js';

class MaterialExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._panel = null;
    }

    async load() {
        super.load();

        // Asegúrate de que Tabulator está cargado
        await Promise.all([
            this.loadScript('https://unpkg.com/tabulator-tables@4.9.3/dist/js/tabulator.min.js', 'Tabulator'),
            this.loadStylesheet('https://unpkg.com/tabulator-tables@4.9.3/dist/css/tabulator.min.css')
        ]);

        // Vincular al botón para mostrar el panel
        const budgetButton = document.getElementById('budget-btn');
        if (budgetButton) {
            budgetButton.addEventListener('click', () => this.togglePanel());
        } else {
            console.error("No se encontró el botón con ID 'budget-btn'.");
        }

        // Registrar el manejador para cuando cambia el modelo
        this.viewer.addEventListener(Autodesk.Viewing.MODEL_ROOT_LOADED_EVENT, this.onModelLoaded.bind(this));

        console.log('MaterialExtension loaded.');
        return true;
    }

    unload() {
        super.unload();

        // Limpiar antes de descargar la extensión
        this.cleanupCharts();

        if (this._panel) {
            this._panel.setVisible(false);
            this._panel = null;
        }

        console.log('MaterialExtension unloaded.');
        return true;
    }

    onModelLoaded(event) {
        // Limpiar los gráficos existentes al cargar un nuevo modelo
        this.cleanupCharts();

        // Si el panel está visible, actualizarlo con el nuevo modelo
        if (this._panel && this._panel.isVisible()) {
            setTimeout(() => {
                this.updatePanelData();
            }, 500);
        }
    }

    cleanupCharts() {
        // Limpiar todas las instancias de Chart.js
        if (window.Chart && window.Chart.instances) {
            Object.keys(window.Chart.instances).forEach(key => {
                try {
                    window.Chart.instances[key].destroy();
                } catch (e) {
                    console.warn(`Error al destruir chart ${key}:`, e);
                }
            });
        }
    }

    async togglePanel() {
        if (!this._panel) {
            // Inicializa el panel solo si no existe
            this._panel = new MaterialPanel(this.viewer);
            this._panel.initialize('panel-container'); // Contenedor debe estar definido en el HTML
        }

        const isVisible = !this._panel.isVisible();
        this._panel.setVisible(isVisible);

        if (isVisible) {
            // Si el panel es visible, actualizamos los datos
            await this.updatePanelData();
        } else {
            // Si se oculta el panel, limpiar los colores y Chart.js
            this.viewer.clearThemingColors();
            this.viewer.impl.sceneUpdated(true);
            this.cleanupCharts();
        }
    }

    async updatePanelData() {
        if (!this.viewer.model) {
            console.error('No hay un modelo cargado en el visor.');
            return;
        }

        try {
            const dbids = await this.findLeafNodes(this.viewer.model);
            this._panel.update(this.viewer.model, dbids);
        } catch (error) {
            console.error('Error al actualizar los datos del panel:', error);
        }
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('MaterialExtension', MaterialExtension);