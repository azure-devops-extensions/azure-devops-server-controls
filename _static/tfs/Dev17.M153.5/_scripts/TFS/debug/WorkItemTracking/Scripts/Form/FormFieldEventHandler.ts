import { WorkItem, Field } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export interface IWorkItemFieldEvents {
    attachFieldChange: (fieldReference: string, handler: IEventHandler) => void;
    detachFieldChange: (fieldReference: string, handler: IEventHandler) => void;
}

export class FormFieldEventHandler {
    private _fieldStatus: { [refName: string]: boolean };
    private _changeDelegate = this.onFieldChanged.bind(this);

    public constructor(
        private readonly workItem: IWorkItemFieldEvents,
        private readonly isPassing: (field: Field) => boolean,
        private readonly updateStatus: (allPassing: boolean) => void,
        fields: { [refName: string]: Field }
    ) {
        this._fieldStatus = {};
        for (let refName in fields) {
            const field = fields[refName];
            if(field) {
                this._fieldStatus[refName] = this.isPassing(field);
            }

            this.workItem.attachFieldChange(refName, this._changeDelegate);
        }
        this.emitStatuses();
    }

    private onFieldChanged(workItem: WorkItem, field: Field) {
        if(field) {
            const refName = field.fieldDefinition.referenceName;
            this._fieldStatus[refName] = this.isPassing(field);
        }
        
        this.emitStatuses();
    }

    private emitStatuses() {
        this.updateStatus(this.areAllPassing());
    }

    private areAllPassing() {
        for (let key in this._fieldStatus) {
            if (!this._fieldStatus[key]) {
                return false;
            }
        }
        return true;
    }

    public detachFields() {
        // Clear old status first
        this.updateStatus(true);
        for (let refName in this._fieldStatus) {
            this.workItem.detachFieldChange(refName, this._changeDelegate);
        }
    }
}
