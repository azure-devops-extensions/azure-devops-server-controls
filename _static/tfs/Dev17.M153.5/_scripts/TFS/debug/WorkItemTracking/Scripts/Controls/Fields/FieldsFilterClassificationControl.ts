import * as React from "react";
import * as ReactDOM from "react-dom";
import { FieldsFilterClassificationPickerWrapper } from "WorkItemTracking/Scripts/MruClassificationPicker/Components/FieldsFilterClassificationPickerWrapper";
import {Control} from "VSS/Controls";
import {FieldDefinition} from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { KeyCode } from "VSS/Utils/UI";
import { autobind } from "OfficeFabric/Utilities";

export interface IFieldsFilterClassificationControlOptions {
    inputAriaLabel?: string;
    field: FieldDefinition;
    projectId: string;
    change: () => void;
    skipPathTruncation?: boolean;
}

export class FieldsFilterClassificationControl<TOptions extends IFieldsFilterClassificationControlOptions> extends Control<TOptions> {
    private _control: FieldsFilterClassificationPickerWrapper;

    public _dispose(): void {        
        super._dispose();
        ReactDOM.unmountComponentAtNode(this._element[0]);
        $(window).off("resize", this._onResize);
    }

    public initialize(): void {
        super.initialize();
        ReactDOM.render(React.createElement(FieldsFilterClassificationPickerWrapper, {
            componentRef: (ref: FieldsFilterClassificationPickerWrapper) => {
                this._control = ref;
            },
            projectId: this._options.projectId,
            field: this._options.field,
            inputAriaLabel: this._options.inputAriaLabel,
            onChange: () => {
                this._options.change()
            },
            skipPathTruncation: this._options.skipPathTruncation
        }), this._element[0]);

        // This is a hack to workaround an issue in jquery dialog scenario (bulk edit for eg).
        // Dialogs are jquery based but the new classification picker is react based
        // and apparenty jquery event dispatcher wins the race against react dispatcher
        // So when we press Esc, jquery dialog's dispatcher is called first which closes the dialog.
        // This is to work around that issue. Instead of depending on react keydown event for handling Esc key
        // we are now listening to parent jquery control. 
        this._element.keydown((e) => {
            if (this._control) {
                if (e.keyCode === KeyCode.ESCAPE) {
                    if (this._control.hideDropdown()) {
                        e.stopPropagation();
                        return false;
                    }
                }

                if (e.keyCode === KeyCode.ENTER) {
                    if (this._control.confirmEdit()) {
                        e.stopPropagation();
                        return false;
                    }
                }
            }
        });

        $(window).resize(this._onResize);
    }

    @autobind
    private _onResize() {
        if (this._control) {
            this._control.onResize();
        }
    }

    /**
     * Sets the text of the control 
     * @param text
     */
    public setText(text: string) {
        if (this._control) {
            this._control.setValue(text);
        }
    }

    /**
     * Returns the text of the control
     */
    public getText(): string {
        if (this._control) {
            return this._control.getValue();
        }
        return "";
    }

    /**
     * Sets enabled state of control
     * @param enabled
     */
    public setEnabled(enabled: boolean) {
        if (this._control) {
            this._control.setEnabled(enabled);
        }
    }

    /**
     * Sets invalid state of control
     * @param invalid
     */
    public setInvalid(invalid: boolean) {
        if (this._control) {
            this._control.setInvalid(invalid);
        }
    }

    /**
     * Sets tree source
     * @param tree
     */
    public setSource(tree: INode | INode[]) {
        if (this._control) {
            this._control.setTree(tree);
        }
    }
}