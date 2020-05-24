import * as Utils_String from "VSS/Utils/String";
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import * as Q from "q";
import WitResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { FieldDefinition } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { IFieldsFilterClassificationControlOptions, FieldsFilterClassificationControl } from "WorkItemTracking/Scripts/Controls/Fields/FieldsFilterClassificationControl";
import * as VSS_Service from "VSS/Service";

export interface IEmptyControlOptions extends Combos.IComboOptions {
}

export class FieldsFilterEmptyControl extends Controls.Control<IEmptyControlOptions> {
    private _macro: FieldsFilterClassificationControl<IFieldsFilterClassificationControlOptions>;
    public initialize() {
        super.initialize();
        this._element.addClass("field-filter-empty-control");

        const options: Combos.IComboOptions = {
            enabled: false,
            mode: "text",
            cssClass: "empty"
        };
        Controls.BaseControl.createIn(Combos.Combo, this._element, options);
    }
    public setText(text: string) {
        // noop
    }
    public getText() {
        return "";
    }
    public setEnabled(enabled: boolean) {
        // noop
    }
    public setInvalid(invalid: boolean) {
        this._macro.setInvalid(invalid);
    }
    public setType(type: string) {
        // noop
    }
    public setMode(mode: string) {
        // noop
    }
}
