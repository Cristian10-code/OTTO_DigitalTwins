export class SelectionState {
    constructor() {
        this.lastSelectedItemId = null;
    }

    setLastSelectedItemId(itemId) {
        this.lastSelectedItemId = itemId;
    }

    getLastSelectedItemId() {
        return this.lastSelectedItemId;
    }
}