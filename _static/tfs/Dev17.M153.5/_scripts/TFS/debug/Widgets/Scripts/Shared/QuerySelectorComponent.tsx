/// <amd-dependency path='VSS/LoaderPlugins/Css!QuerySelectorComponent' />

import React = require("react");

import * as Controls from "VSS/Controls";
import * as Component_Platform from "VSS/Flux/PlatformComponent";
import * as ComponentBase from "VSS/Flux/Component";
import * as BladeConfigurationQueryControl from "Widgets/Scripts/Shared/BladeConfigurationQueryControl";
import { IQueryInformation } from "Widgets/Scripts/QueryScalar";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Utils_Core from "VSS/Utils/Core";

import * as Context from "VSS/Context";
var delegate = Utils_Core.delegate;

export interface IQuerySelectorComponentProps extends ComponentBase.Props {
    value: string;
    onValueChanged(value: string): void;
    label?: string;
    disabled?: boolean;
}

/**
 * Component for query selector control
 */
export class QuerySelectorComponent extends Component_Platform.Component<BladeConfigurationQueryControl.QuerySelectorControl, IQuerySelectorComponentProps, Component_Platform.State> {

    protected createControl(element: JQuery): BladeConfigurationQueryControl.QuerySelectorControl {
        if (!this._control) {

            let $querySelectorContainer = $('<div>').addClass("wit-query-selector-container");
            let $queryContainer = element.append($querySelectorContainer);

            let queryInfo: IQueryInformation = {
                queryName: null, 
                queryId: this.props.value
            }

            let options : BladeConfigurationQueryControl.QuerySelectorOptions = {
                onChange: delegate(this, this._onQueryControlValueChanged),
                webContext: Context.getDefaultWebContext(),
                initialValue: queryInfo,
                disabled: this.props.disabled
            };

            this._control = Controls.create<BladeConfigurationQueryControl.QuerySelectorControl, BladeConfigurationQueryControl.QuerySelectorOptions>(BladeConfigurationQueryControl.QuerySelectorControl, $($querySelectorContainer), options);
            this._setAriaProperties(this._control);
        }

        return this._control;
    }

    private _setAriaProperties(control: BladeConfigurationQueryControl.QuerySelectorControl): void {
        // Set aria-label on combobox
        if(control && this.props.label) {
            var input = control.getElement().find("input").attr("aria-label", this.props.label);
        }
    }

    private _onQueryControlValueChanged(): void {
        if (this.props.onValueChanged) {            
            this.props.onValueChanged(this._control.getCurrentValue().queryId);
        }
    }
}

SDK_Shim.registerContent("workitem.query-selector", (context) => {
    return <QuerySelectorComponent
        value={context.options.value}
        onValueChanged={context.options.onValueChanged}
        label={context.options.label}
        disabled={context.options.disabled} />
});
