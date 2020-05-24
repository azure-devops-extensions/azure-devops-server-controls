import React = require("react");

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import Controls = require("VSS/Controls");
import IdentityPicker = require("VSS/Identities/Picker/Controls");
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import Component_Platform = require("VSS/Flux/PlatformComponent");
import * as Utils_String from "VSS/Utils/String";

export interface IProps extends Component_Platform.Props<IdentityPicker.IIdentityPickerSearchOptions> {
    /**
     * Method to be call when new identities are added or removed from Identity picker
     */
    onSelectedIdentitiesChanged: (identities: Identities_Picker_RestClient.IEntity[]) => void;

    /**
     * Method to call when user do focus out from identity picker
     */
    onFocusOut?: (unresolvedQueries: string[]) => void;

    /**
     * Consumer id to be used by identity picker
     */
    consumerId: string;
}

/**
 * Component for Identity picker
 */
export class IdentityPickerComponent extends Component_Platform.Component<IdentityPicker.IdentityPickerSearchControl, IProps, Component_Platform.State> {

    /**
     * Method to create Identity picker control.
     */
    protected createControl(element: JQuery): IdentityPicker.IdentityPickerSearchControl {
        if (!this._control) {
            let options: IdentityPicker.IIdentityPickerDropdownOptions = JQueryWrapper.extendDeep(this._getDefaultOptions(), this.props.options);
            this._control = Controls.create<IdentityPicker.IdentityPickerSearchControl, IdentityPicker.IIdentityPickerSearchOptions>(IdentityPicker.IdentityPickerSearchControl, $(element), options);

            // Binding the identity removal event
            this._control._bind(IdentityPicker.IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT, () => {
                this._onIdentityPickerSelectionChange();
            });

            // Added an event to handle foucs out on input box
            let $input = this._control.getElement().find("#identitypicker-component-input").first();
            $input.bind("blur", this._onFocusOut);
        }
        return this._control;
    }

    /**
     * Returns the default identity picker options
     */
    private _getDefaultOptions(): IdentityPicker.IIdentityPickerSearchOptions {
        // ToDo:[adsurang] Revisit the default options once we have more clarity on spec 
        let options: IdentityPicker.IIdentityPickerSearchOptions;
        options = {
            identityType: { User: true, Group: true },
            showMruTriangle: false,
            showMru: false,
            consumerId: this.props.consumerId,
            placeholderText: Utils_String.empty,
            callbacks: {
                onItemSelect: this._onIdentityAdd,
                onInputBlur: this._onFocusOut
            },
            retainInputIdentitiesSequenceWithinPage: true
        };
        return options;
    }

    private _onIdentityAdd = (entity: Identities_Picker_RestClient.IEntity): void => {
        this._onIdentityPickerSelectionChange();
    }

    /**
     * Method to be called when identity picker selection changes
     */
    private _onIdentityPickerSelectionChange = (): void => {
        if (this.props.onSelectedIdentitiesChanged) {
            let resolvedIdentities = this._getResolvedIdentities();
            this.props.onSelectedIdentitiesChanged(resolvedIdentities);
        }
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

    /**
     * Method to fetch unresolved Identities on focus out
     */
    private _onFocusOut = () => {
        let searchResult = this._control.getIdentitySearchResult();
        let unresolvedQueries: string[] = [];
        if (searchResult && this.props.onFocusOut) {
            if (searchResult.unresolvedQueryTokens && searchResult.unresolvedQueryTokens.length > 0) {
                unresolvedQueries = searchResult.unresolvedQueryTokens;
            }
            this.props.onFocusOut(unresolvedQueries);
        }
    }
}