import * as React from "react";
import * as ReactDOM from "react-dom";

import { WorkItemType, WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WorkItemControl, IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { WorkItemClassificationPickerWrapper } from "WorkItemTracking/Scripts/MruClassificationPicker/Components/WorkItemClassificationPickerWrapper";
import { IContainedFieldControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/Interfaces";
import { KeyCode } from "VSS/Utils/UI";

export interface IWorkItemClassificationControlOptions extends IWorkItemControlOptions {
    comboCssClass?: string;
    allowEmpty?: boolean;
    useLegacy?: boolean;
    renderCallback?: () => void;
}

export class WorkItemClassificationControl extends WorkItemControl {
    public _options: IWorkItemClassificationControlOptions;
    private _control: IContainedFieldControl;

    constructor(container: JQuery, options?: IWorkItemClassificationControlOptions, workItemType?: WorkItemType) {
        super(container, options, workItemType);
    }

    public _init() {
        super._init();

        this._container.addClass("new-classification-control");
        ReactDOM.render(React.createElement(WorkItemClassificationPickerWrapper, {
            componentRef: (ref: IContainedFieldControl) => {
                this._control = ref;
            },
            allowEmpty: this._options.allowEmpty,
            field: this.getFieldDefinition(this._fieldName),
            workItemControl: this,
            onChange: () => {
                this.flush();
            }
        }), this._container[0], this._options.renderCallback);

        // This is a hack to workaround an issue in WIT dialog scenario.
        // WIT dialogs are jquery based but the new classification picker is react based
        // and apparenty jquery event dispatcher wins the race against react dispatcher
        // So when we press Esc, jquery dialog's dispatcher is called first which closes the dialog.
        // This is to work around that issue. Instead of depending on react keydown event for handling Esc key
        // we are now listening to parent jquery control. 
        this._container.keydown((e) => {
            if (this._control) {
                if (e.keyCode === KeyCode.ESCAPE) {
                    if ((this._control as WorkItemClassificationPickerWrapper).hideDropdown()) {
                        e.stopPropagation();
                        return false;
                    }
                }

                if (e.keyCode === KeyCode.ENTER) {
                    if ((this._control as WorkItemClassificationPickerWrapper).confirmEdit()) {
                        e.stopPropagation();
                        return false;
                    }
                }
            }
        });
    }

    public dispose() {
        ReactDOM.unmountComponentAtNode(this._container[0]);
    }

    public invalidate(flushing) {
        super.invalidate(flushing);
        if (this._control) {
            this._control.invalidate(flushing, this._getField());
        }
    }

    public _getControlValue(): string {
        if (this._control) {
            return this._control.getValue();
        }
        return "";
    }

    public clear() {
        if (this._control) {
            this._control.clear();
        }
    }

    protected onControlResized() {
        if (this._control) {
            this._control.onResize();
        }
    }

    public bind(workItem: WorkItem, disabled?: boolean) {
        super.bind(workItem, disabled);
        if (workItem && this._control) {
            this._control.onBind(workItem);
        }
    }

    public unbind(isDisposing?: boolean) {
        if (this._workItem && this._control) {
            this._control.onUnbind();
        }
        super.unbind(isDisposing);
    }
}
