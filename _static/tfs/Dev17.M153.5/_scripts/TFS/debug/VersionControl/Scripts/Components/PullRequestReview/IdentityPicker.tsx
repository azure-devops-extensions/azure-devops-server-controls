import * as React from "react";
import { IdentityPickerSearch } from "Presentation/Scripts/TFS/Components/IdentityPickerSearch";

import { IdentityPickerControlSize } from "VSS/Identities/Picker/Controls";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { IdentityHelper } from "VersionControl/Scenarios/PullRequestCreate/Helpers";

export interface IIdentityPickerProps {
    pullRequestId: number;
    focusOnLoad: boolean;
    dropdownWidth?: number;
    consumerId: string;
    addReviewer(pullRequestId: number, reviewerIdentity: IdentityRef):void;
}

export class IdentityPickerSearchContainer extends React.Component<IIdentityPickerProps, {}> {

    public identitySelected = (identity: IEntity): void => {
        this.props.addReviewer(this.props.pullRequestId, IdentityHelper.transformIEntityToIdentityRef(identity));
    }

    public render(): JSX.Element {
        return <IdentityPickerSearch {...
            {
                ...this.props,
                identitySelected: this.identitySelected,
                className: "vc-pullrequest-details-view-reviewer-quickeditor",
                multiIdentitySearch: false,
                inlineSelectedEntities: false,
                controlSize: IdentityPickerControlSize.Small
            }} />;
    }
}
