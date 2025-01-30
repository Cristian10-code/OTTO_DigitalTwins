import { BaseExtension } from './BaseExtension.js';

class LoggerExtension extends BaseExtension {
    load() {
        super.load();
        console.log('LoggerExtension loaded.');
        return true;
    }

    unload() {
        super.unload();
        console.log('LoggerExtension unloaded.');
        return true;
    }

    async onModelLoaded(model) {
        super.onModelLoaded(model);
        const props = await this.findPropertyNames(this.viewer.model);
        console.log('New model has been loaded. Its objects contain the following properties:', props);
    }

    //async onSelectionChanged(model, dbids) {
    //    super.onSelectionChanged(model, dbids);
    //    console.log('Selection has changed', dbids);
    //}
    async onSelectionChanged(model, dbids) {
        super.onSelectionChanged(model, dbids);
        console.log('Selection has changed', dbids);

        // Si no hay ningún elemento seleccionado
        if (!dbids || dbids.length === 0) {
            document.getElementById("container-url").innerText = "No hay selección";
            return;
        }

        // Si quieres manejar múltiples elementos, podrías iterar sobre dbids
        // En este ejemplo, solo manejamos el primer elemento seleccionado
        const dbId = dbids[0];

        // Obtenemos las propiedades del elemento seleccionado
        model.getProperties(dbId, (data) => {
            if (data && data.properties) {
                // Buscamos la propiedad que tenga displayName = "URL"
                const urlProperty = data.properties.find(prop => prop.displayName === "URL");
                console.log('URL', urlProperty);
                document.getElementById("container-url").innerHTML = `
            <iframe src="${urlProperty.displayValue}"
                    style="width:100%; height:100%;"
                    frameborder="0">
            </iframe>`;           
            }
        });
    }

    onIsolationChanged(model, dbids) {
        super.onIsolationChanged(model, dbids);
        console.log('Isolation has changed', dbids);
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('LoggerExtension', LoggerExtension);