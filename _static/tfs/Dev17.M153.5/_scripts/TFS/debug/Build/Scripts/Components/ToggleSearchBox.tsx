/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />



import TFS_React = require("Presentation/Scripts/TFS/TFS.React");

import Controls = require("VSS/Controls");
import ControlsSearch = require("VSS/Controls/Search");
import VSS = require("VSS/VSS");

// TFS controls

/* 
** ToggleSearchBoxComponent is a wrapper aropund TFS togglesearchboxcontrol
*/
export interface IToggleSearchBoxProps extends TFS_React.ITfsComponentProps {
    options: ControlsSearch.IToggleSearchBoxControlOptions;
    visible: boolean;
}

export class ToggleSearchBoxComponent extends TFS_React.TfsComponent<IToggleSearchBoxProps, TFS_React.IState> {
    private _toggleSearchControl: ControlsSearch.ToggleSearchBoxControl;
    protected onRender(element: HTMLElement) {
        if (!this._toggleSearchControl) {
            this._toggleSearchControl = Controls.create(ControlsSearch.ToggleSearchBoxControl, $(element), this.props.options);
        }
        if (this.props.visible) {
            this._toggleSearchControl.showElement();
        }
        else {
            this._toggleSearchControl.hideElement();
        }
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("ToggleSearchBox", exports);
