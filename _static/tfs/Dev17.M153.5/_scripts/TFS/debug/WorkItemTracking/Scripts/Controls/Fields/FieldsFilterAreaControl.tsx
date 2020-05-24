import { autobind } from "OfficeFabric/Utilities";
import * as Utils_String from "VSS/Utils/String";
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import { FieldDefinition } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { IFieldsFilterClassificationControlOptions, FieldsFilterClassificationControl } from "WorkItemTracking/Scripts/Controls/Fields/FieldsFilterClassificationControl";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { WiqlOperators_MacroTeamAreas } from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.Common";
import * as VSS_Service from "VSS/Service";
import { parseTeamAreas } from "WorkItemTracking/Scripts/OM/WiqlValues";
import { TeamPicker, ITeamPickerProps } from "Presentation/Scripts/TFS/Components/TeamPicker";
import * as ReactDOM from "react-dom";
import * as React from "react";

export interface IAreaControlOptions extends Combos.IComboOptions {
    projectId: string;
    projectName: string;
    field: FieldDefinition;
    crossProject: boolean;
}

export class FieldsFilterAreaControl extends Controls.Control<IAreaControlOptions> {
    private _macro: FieldsFilterClassificationControl<IFieldsFilterClassificationControlOptions>;
    private _teamContainer: JQuery;
    private _teamParameter: TeamPicker;
    public initialize() {
        super.initialize();
        this._element.addClass("field-filter-area-control");

        const macroOptions: IFieldsFilterClassificationControlOptions = {
            field: this._options.field,
            projectId: this._options.projectId,
            inputAriaLabel: this._options.label,
            change: () => {
                this._options.change();
                this._checkParameterVisiblity();
            },
        };
        this._macro = Controls.BaseControl.createIn(FieldsFilterClassificationControl, this._element, macroOptions) as FieldsFilterClassificationControl<IFieldsFilterClassificationControlOptions>;

        this._teamContainer = $("<div class='team-container'/>").appendTo(this._element);
        const teamPickerOptions: ITeamPickerProps = {
            crossProject: this._options.crossProject,
            projectId: this._options.projectId,
            projectName: this._options.projectName,
            onChanged: this._options.change,
        };

        ReactDOM.render(<TeamPicker
            {...teamPickerOptions}
            ref={this._setTeamPicker}
        />, this._teamContainer[0]);

        this._checkParameterVisiblity();
    }

    @autobind
    private _setTeamPicker(ref: TeamPicker) {
        this._teamParameter = ref;
    }

    private _checkParameterVisiblity(macroText: string = this._macro.getText()) {
        if (this._teamParameter) {
            this._teamParameter.setHidden(!parseTeamAreas(macroText));
        }
    }
    public setText(text: string) {
        const areas = parseTeamAreas(text);
        if (areas) {
            this._macro.setText(`@${WiqlOperators_MacroTeamAreas}`);
            this._teamParameter.setText(areas.team || "");
        } else {
            this._macro.setText(text);
        }
        this._checkParameterVisiblity(text);
    }
    public getText() {
        let value = this._macro.getText();
        const areas = parseTeamAreas(value);
        if (areas) {
            value = `@${WiqlOperators_MacroTeamAreas}`;
            const team = this._teamParameter.getText();
            if (team) {
                value += `('${team}')`;
            }
        }
        return value;
    }
    public setEnabled(enabled: boolean) {
            this._macro.setEnabled(enabled);
            this._teamParameter.setEnabled(enabled);
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
    public setSource(source: INode[]) {
        this._macro.setSource(source);
    }
}
