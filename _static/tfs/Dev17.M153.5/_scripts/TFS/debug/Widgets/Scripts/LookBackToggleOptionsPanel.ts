import * as Controls from 'VSS/Controls';
import { Checkbox } from 'Widgets/Scripts/Shared/Checkbox';

/**Describes values of panel. This contract is used for initialization and exposing state. */

export interface LookBackCheckboxInfo {
    checkboxId: string,
    label: string;
    checked: boolean; 
    enabled: boolean; // is checkbox enabled for rendering in configuration panel
}

export interface LookBackToggleOptionsPanelOptions extends Controls.EnhancementOptions {
    onChange: () => void;
    checkboxInfo: LookBackCheckboxInfo[]; //checkbox information that gets passed from the Configuration file
}

export abstract class LookBackToggleOptionsPanel extends Controls.Control<LookBackToggleOptionsPanelOptions> {
    protected checkboxes: Checkbox[];

    constructor(options: LookBackToggleOptionsPanelOptions) {
        super(options);
        this.checkboxes = []; 
    }

    public initializeOptions(options: LookBackToggleOptionsPanelOptions) {
        options.cssClass = "burndown-options-panel";
        super.initializeOptions(options);
    }

    /** Initializing the panel that contains all the checkbox options */
    public initialize() {
        var $container = this.getElement();

        // initialize checkboxes
        for (let labelIdx in this._options.checkboxInfo) {
            if (this._options.checkboxInfo[labelIdx].enabled) { //check if checkbox option is enabled
                this.checkboxes[labelIdx] = new Checkbox(
                    $container, {
                        checkboxId: this._options.checkboxInfo[labelIdx].checkboxId,
                        checkboxLabel: this._options.checkboxInfo[labelIdx].label,
                        onChange: () => {
                            this._options.onChange();
                        }
                    }
                )

                // Setting checked default for initial widget render.
                this.checkboxes[labelIdx].setChecked(this._options.checkboxInfo[labelIdx].checked);
            }
        }
    }
}