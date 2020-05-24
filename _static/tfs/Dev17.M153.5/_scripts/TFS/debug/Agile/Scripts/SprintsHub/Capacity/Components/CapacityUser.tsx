import * as Contracts from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { IdentityRenderer } from "TFSUI/Identity/IdentityRenderer";
import { IdentityHelper, IdentityImageMode, IdentityImageSize } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import * as React from "react";

/**
 * Renders the User avatar and name for the Capacity Grid
 */
export class CapacityUser extends React.Component<Contracts.IUser> {
    public render() {
        const teamMember = this.props;
        const identity = IdentityHelper.parseUniquefiedIdentityName(teamMember.displayName);
        const imageSource = IdentityHelper.getIdentityImageUrl(
            identity, IdentityImageMode.ShowGenericImage, IdentityImageSize.Small);

        return (
            <div className="user">
                <IdentityRenderer
                    displayName={identity.displayName}
                    imageSource={imageSource}
                    tooltip={teamMember.uniqueName} />
            </div>
        );
    }

    public shouldComponentUpdate(nextProps: Contracts.IUser) {
        return this.props.id !== nextProps.id;
    }
}