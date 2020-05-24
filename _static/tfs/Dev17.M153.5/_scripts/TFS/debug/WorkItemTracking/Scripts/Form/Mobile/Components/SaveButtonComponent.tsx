import React = require("react");
import ReactDOM = require("react-dom");

import { css } from "OfficeFabric/Utilities";
import { HeaderButtonComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/HeaderButtonComponent";

import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export class SaveButtonComponent extends HeaderButtonComponent<{}, {}> {
    constructor(props: {}, context?: any) {
        super(props, context);
    }

    protected _onClick() {
        this._formContext.workItem.beginSave($.noop, $.noop);
    }

    protected _getClasses(): string {
        return css("save-button",
            "bowtie-icon",
            "bowtie-save",
            { "is-disabled": this._isDisabled() }
        );
    }

    protected _getAriaLabel(): string {
        return WorkItemTrackingResources.WorkItemSaveLabel;
    }

    protected _isDisabled(): boolean {
        return !this._formContext.workItem
            || !this._formContext.workItem.isDirty()
            || !this._formContext.workItem.isValid();
    }
}