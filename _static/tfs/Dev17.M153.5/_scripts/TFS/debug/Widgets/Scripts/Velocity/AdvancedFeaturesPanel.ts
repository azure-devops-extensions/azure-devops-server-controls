import * as Controls from "VSS/Controls";
import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import { Selector } from "Dashboards/Scripts/Selector";
import { ToggleableNumericInput, ToggleableNumericInputOptions } from "Widgets/Scripts/Shared/NumericInput";

/**Describes values of panel. This contract is used for initialization and exposing state. */
export interface AdvancedFeaturesPanelValues {
    isPlannedWorkEnabled: boolean;
    plannedWorkStartOffset: number;

    isLateWorkEnabled: boolean;
    lateWorkDeadlineOffset: number;
}

export interface AdvancedFeaturesPanelOptions extends Controls.EnhancementOptions, AdvancedFeaturesPanelValues {
    onChange: () => void;
}

/** Implements Velocity Advanced features config as a linear composition of controls in a stack layout. */
export class AdvancedFeaturesPanel extends Controls.Control<AdvancedFeaturesPanelOptions> implements Selector {
    private plannedWorkControl: ToggleableNumericInput;
    private lateWorkControl: ToggleableNumericInput;

    constructor(options: AdvancedFeaturesPanelOptions) {
        super(options);
    }

    public initializeOptions(options: AdvancedFeaturesPanelOptions) {
        options.cssClass = "advanced-velocity-options-stackpanel";        
        super.initializeOptions(options);
    }

    public initialize() {
        let plannedWorkBlockOptions: ToggleableNumericInputOptions = {
            toggleLabel: Resources.VelocityConfig_DisplayPlannedWorkHeader,
            toggleOn: this._options.isPlannedWorkEnabled,

            inputLabel: Resources.VelocityConfig_PlannedWorkBodyText,
            inputValue: this._options.plannedWorkStartOffset,

            onChange: () => { this._options.onChange(); },

            minValue: 0
        };

        let lateWorkBlockOptions: ToggleableNumericInputOptions = {
            toggleLabel: Resources.VelocityConfig_DisplayCompletedLateWorkHeader,
            toggleOn: this._options.isLateWorkEnabled,

            inputLabel: Resources.VelocityConfig_LateWorkBodyText,
            inputValue: this._options.lateWorkDeadlineOffset,

            onChange: () => { this._options.onChange(); },

            minValue: 0
        };

        this.plannedWorkControl = ToggleableNumericInput.create(ToggleableNumericInput, this.getElement(), plannedWorkBlockOptions);
        this.lateWorkControl = ToggleableNumericInput.create(ToggleableNumericInput, this.getElement(), lateWorkBlockOptions);
    }

    public validate(): string {
        return this.plannedWorkControl.validate() || this.lateWorkControl.validate();
    }

    public setEnabled(value: boolean): void {
        this.plannedWorkControl.setEnabled(value);
        this.lateWorkControl.setEnabled(value);
    }

    public getSettings(): AdvancedFeaturesPanelValues {
        let plannedWorkSettings = this.plannedWorkControl.getSettings();
        let lateWorkSettings = this.lateWorkControl.getSettings();
        return {
            isPlannedWorkEnabled: plannedWorkSettings.toggleOn,
            plannedWorkStartOffset: plannedWorkSettings.inputValue,
            isLateWorkEnabled: lateWorkSettings.toggleOn,
            lateWorkDeadlineOffset: lateWorkSettings.inputValue
        };
    }
}