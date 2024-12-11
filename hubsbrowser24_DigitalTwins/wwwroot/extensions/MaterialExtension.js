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

        console.log('MaterialExtension loaded.');
        return true;
    }

    unload() {
        super.unload();
        if (this._panel) {
            this._panel.setVisible(false);
            this._panel = null;
        }
        console.log('MaterialExtension unloaded.');
        return true;
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
