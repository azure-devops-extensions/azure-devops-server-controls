import * as React from "react";

import { Label } from "OfficeFabric/Label";

import * as Controls from "VSS/Controls";
import * as Component_Platform from "VSS/Flux/PlatformComponent";
import * as IdentityPicker from "VSS/Identities/Picker/Controls";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import * as Utils_Core from "VSS/Utils/Core";

import * as PackageResources from "Feed/Common/Resources";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/Settings/IdentityPickerWrapper";

// Dropdown height should contain within dialog's height
const displayedListItemCount: number = 5;

export interface IProps extends Component_Platform.Props<IdentityPicker.IIdentityPickerDropdownOptions> {
    consumerId: string;
    onIdentitiesResolved: (identities: IEntity[]) => void;

    /**
     * When true, search and dropdown controls should handle multiple identities
     */
    multiIdentitySearch: boolean;
}

export class IdentityPickerWrapper extends Component_Platform.Component<
    IdentityPicker.IdentityPickerSearchControl,
    IProps,
    Component_Platform.State
> {
    protected createControl(element: JQuery): IdentityPicker.IdentityPickerSearchControl {
        const control: IdentityPicker.IdentityPickerSearchControl = Controls.create<
            IdentityPicker.IdentityPickerSearchControl,
            IdentityPicker.IIdentityPickerSearchOptionsInternal
        >(IdentityPicker.IdentityPickerSearchControl, $(element), {
            consumerId: this.props.consumerId,
            multiIdentitySearch: this.props.multiIdentitySearch,
            identityType: {
                User: true,
                Group: true
            },
            operationScope: {
                IMS: true
            },
            showMru: true,
            showMruTriangle: true,
            showContactCard: false,
            highlightResolved: true,
            size: IdentityPicker.IdentityPickerControlSize.Medium,
            pageSize: displayedListItemCount,
            dropdownSize: IdentityPicker.IdentityPickerControlSize.Medium,
            dropdownContainer: () => $("#identityPickerDropdownContainer")
        } as IdentityPicker.IIdentityPickerSearchOptionsInternal);

        element.bind(
            IdentityPicker.IdentityPickerSearchControl.VALID_INPUT_EVENT,
            Utils_Core.delegate(this, this._onIdentitySelectionChange)
        );
        element.bind(
            IdentityPicker.IdentityPickerSearchControl.INVALID_INPUT_EVENT,
            Utils_Core.delegate(this, this._onIdentitySelectionChange)
        );
        element.bind(
            IdentityPicker.IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT,
            Utils_Core.delegate(this, this._onIdentitySelectionChange)
        );

        this._inputElement = control.getElement().find(".identity-picker-input");
        return control;
    }

    public render(): JSX.Element {
        const props = {
            ref: (element: HTMLElement): void => {
                this.onRef(element);
            }
        };
        return (
            <div className="identity-picker-wrapper">
                <Label>{PackageResources.FeedSettings_AddPermission_IdentityPicker_Label}</Label>
                <div {...props} className="identity-picker-control">
                    <div id="identityPickerDropdownContainer" />
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        super.componentDidMount();

        this._inputElement.attr("aria-label", PackageResources.FeedSettings_AddPermission_IdentityPicker_AriaLabel);
        this._inputElement.focus();
    }

    private _onIdentitySelectionChange(): void {
        const resolvedIdentities = this._control.getIdentitySearchResult().resolvedEntities;

        if (resolvedIdentities && resolvedIdentities.length > 0) {
            this._control.addIdentitiesToMru(resolvedIdentities);
            this._inputElement.focus();

            this.props.onIdentitiesResolved(resolvedIdentities);
        } else {
            // only 1 identity existed before and it is removed now
            this.props.onIdentitiesResolved(null);
        }
    }

    private _inputElement;
}
