import Controls = require("VSS/Controls");
import Locations = require("VSS/Locations");
import OMIdentities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import {IdentityDisplayControl, IIdentityDisplayOptions, IdentityPickerControlSize, EDisplayControlType, EntityFactory} from "VSS/Identities/Picker/Controls";
import { LegacyComponent, ILegacyComponentProps, ILegacyComponentState } from "Presentation/Scripts/TFS/Components/LegacyComponent";

export interface IIdentityProps extends ILegacyComponentProps {
    /**
     * Uniquefied Identity name/id (ie identity uid) - this value is passed to parseUniquefiedIdentityName to resolve the IIdentityReference.
     */
    value: string;

    /**
     * A unique guid representing the consumer id for the identity control
     */
    consumerId: string;

    /**
     * [Optional] The string to display prior to the identity being resolved. Must evaluate to true to be displayed (ie "" will not be displayed, use " " instead).
     * If no value is given then the parsed IIdentityReference (from the value property) display name will be used - if that has no value then Unassigned will be used.
     */
    unresolvedDisplayName?: string;

    /**
     * [Optional] Size of the identity control. If no size is specified a IdentityPickerControlSize.Medium will be rendered.
     */
    size?: IdentityPickerControlSize;

    /**
     * [Optional] Display format to use for the Identity control. If no format is specified EDisplayControlType.AvatarText will be used.
     */
    displayFormat?: EDisplayControlType;
}

export interface IIdentityState extends ILegacyComponentState {
}

/**
 * React Identity component.
 *  - Currently this wraps the legacy control.
 */
export class Identity extends LegacyComponent<IdentityDisplayControl, IIdentityProps, IIdentityState> {

    public shouldComponentUpdate(nextProps: IIdentityProps, nextState: IIdentityState): boolean {
        return this.props.value !== nextProps.value;
    }

    public createControl(element: HTMLElement, props: IIdentityProps, state: IIdentityState): IdentityDisplayControl {
        const user: OMIdentities.IIdentityReference = OMIdentities.IdentityHelper.parseUniquefiedIdentityName(props.value);
        const options: IIdentityDisplayOptions = this._getIdentityOptions(user, props.consumerId, props.size, props.displayFormat);

        return Controls.create(IdentityDisplayControl, $(element), options);
    }

    private _getIdentityOptions(user: OMIdentities.IIdentityReference, consumerId: string, size?: IdentityPickerControlSize, displayType?: EDisplayControlType): IIdentityDisplayOptions {
        const options: IIdentityDisplayOptions = {
            identityType: { User: true, Group: true },
            operationScope: { Source: true, IMS: true },
            consumerId: consumerId,
            item: (user && (user.uniqueName || user.displayName)) || EntityFactory.createStringEntity(PresentationResources.Unassigned, Locations.urlHelper.getVersionedContentUrl("notassigned-user.svg")),
            size: size != null ? size : IdentityPickerControlSize.Medium,
            displayType: displayType || EDisplayControlType.AvatarText,
            friendlyDisplayName: this.props.unresolvedDisplayName || (user && user.displayName) || PresentationResources.Unassigned,
            turnOffHover: true /* no contact card on hover */
        };

        return options;
    }
}
