import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";

export class UndoableWorkItemControl extends WorkItemControl {

    constructor(container, options?, workItemType?) {
        super(container, options, workItemType);
    }

    public _smartFlush(element, preventFire, controlValue?: string) {
        if (!this.isReadOnly()) {
            var field = this._getField();
            if (field) {
                try {
                    this._flushing = true;
                    var value = (controlValue === null || controlValue === undefined) ? this._getControlValue() : controlValue;
                    field.setValue(value, preventFire);
                }
                finally {
                    this._flushing = false;
                }
            }
        }
    }
}