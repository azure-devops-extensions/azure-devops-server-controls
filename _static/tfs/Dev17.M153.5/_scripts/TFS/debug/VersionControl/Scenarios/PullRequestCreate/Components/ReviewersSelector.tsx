import React = require("react");

import { IdentityPickerSearch } from "Presentation/Scripts/TFS/Components/IdentityPickerSearch";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import { Label } from "OfficeFabric/Label";
import { IdentityPickerControlSize } from "VSS/Identities/Picker/Controls";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { IdentityHelper } from "VersionControl/Scenarios/PullRequestCreate/Helpers";

import "VSS/LoaderPlugins/Css!VersionControl/ReviewersSelector";

export interface ReviewersSelectorProps {
    onIdentitiesUpdated(identities: IdentityRef[]):void;
    defaultReviewers: IdentityRef[];
}

const consumerId = "d0b26ed6-50f2-48cc-86b4-1f91f9ceb00d" // randomly generated guid for IdentityPicker telemetry

export class ReviewersSelector extends React.PureComponent<ReviewersSelectorProps, {}> {

    public reviewersUpdated = (identities: IEntity[]): void => {
        const ids: IdentityRef[] = IdentityHelper.transformIEntitiesToIdentityRefs(identities);
        this.props.onIdentitiesUpdated(ids);
    }

    public render(): JSX.Element {
        return <div className="vc-pullRequestCreate-reviewers">
            <Label htmlFor="reviewers-edit" className="vc-pullRequestCreate-label">{VCResources.PullRequest_Reviewers}</Label>
            <IdentityPickerSearch className="vc-pullRequestCreate-reviewers-selector"
                consumerId={consumerId}
                dropdownWidth={600}
                focusOnLoad={false}
                showMruOnClick={true}
                identitiesUpdated={(ids) => this.reviewersUpdated(ids)}
                inlineSelectedEntities={true}
                multiIdentitySearch={true}
                defaultEntities={this.props.defaultReviewers.map(identity => identity.id)}
                controlSize={IdentityPickerControlSize.Medium}
                id="reviewers-edit"
                placeholderText={VCResources.PullRequestCreate_SearchReviewersPlaceholder} />
        </div>;
    }

}