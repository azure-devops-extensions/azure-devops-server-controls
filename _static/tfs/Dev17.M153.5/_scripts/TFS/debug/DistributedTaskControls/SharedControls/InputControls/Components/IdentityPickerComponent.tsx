import React = require("react");

import * as Controls from "VSS/Controls";
import * as IdentityPicker from "VSS/Identities/Picker/Controls";
import * as Identities_Picker_RestClient from "VSS/Identities/Picker/RestClient";
import * as Component_Platform from "VSS/Flux/PlatformComponent";

export interface IIdentityPickerComponentProps extends Component_Platform.Props<IdentityPicker.IIdentityPickerSearchOptions> {
    consumerId: string;
    onSelectedIdentitiesChanged(identities: Identities_Picker_RestClient.IEntity[]): void;
    disabled?: boolean;
    required?: boolean;
}

/**
 * Component for Identity picker
 */
export class IdentityPickerComponent extends Component_Platform.Component<IdentityPicker.IdentityPickerSearchControl, IIdentityPickerComponentProps, Component_Platform.State> {

    /**
     * Method to create Identity picker control.
     */
    protected createControl(element: JQuery): IdentityPicker.IdentityPickerSearchControl {
        if (!this._control) {

            let options: IdentityPicker.IIdentityPickerDropdownOptions & IdentityPicker.IIdentityPickerSearchOptions = this._getDefaultOptions();
            if (!!this.props.options) {
                options = { ...options, ...(this.props.options) };
            }

            this._control = Controls.create<IdentityPicker.IdentityPickerSearchControl, IdentityPicker.IIdentityPickerSearchOptions>(IdentityPicker.IdentityPickerSearchControl, $(element), options);

            // Binding the identity removal event
            if (!!this._control) {
                this._control._bind(IdentityPicker.IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT, () => {
                    this._onIdentityPickerSelectionChange();
                });
            }
        }

        //Setting readonly mode
        this._setReadOnlyMode();

        return this._control;
    }

    /**
    * Sets the readonly mode for the control if disabled prop is passed.
    */
    private _setReadOnlyMode() {
        if (this._control) {
            if (this.props.disabled) {
                this._control.enableReadOnlyMode();
            }
            else {
                this._control.disableReadOnlyMode();
            }
        }
    }

    /**
     * Returns the default identity picker options
     */
    private _getDefaultOptions(): IdentityPicker.IIdentityPickerSearchOptions {
        let options: IdentityPicker.IIdentityPickerSearchOptions;
        options = {
            identityType: { User: true, Group: true },
            callbacks: {
                onItemSelect: this._onIdentityAdd,
            },
            operationScope: { IMS: true },
            consumerId: this.props.consumerId || this.c_identityPickerConsumerId,
            required: !!this.props.required
        };
        return options;
    }

    private _onIdentityPickerSelectionChange = (): void => {
        if (this.props.onSelectedIdentitiesChanged) {
            let resolvedIdentities = this._getResolvedIdentities();
            this.props.onSelectedIdentitiesChanged(resolvedIdentities);
        }
    }

    private _onIdentityAdd = (entity: Identities_Picker_RestClient.IEntity): void => {
        this._onIdentityPickerSelectionChange();
    }

    /**
     * Get all the identities resolved by identity picker
     */
    private _getResolvedIdentities(): Identities_Picker_RestClient.IEntity[] {
        let resolvedIdentities: Identities_Picker_RestClient.IEntity[] = [];
        let searchResult = this._control.getIdentitySearchResult();
        if (searchResult) {
            resolvedIdentities = searchResult.resolvedEntities;
        }
        return resolvedIdentities;
    }

    private c_identityPickerConsumerId: string = "4E250E55-B57F-4B12-B248-EB2F9CF59429";
}