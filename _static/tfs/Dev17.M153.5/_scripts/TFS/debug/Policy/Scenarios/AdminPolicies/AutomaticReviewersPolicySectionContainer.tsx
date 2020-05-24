// libs
import * as React from "react";

// utils
import { autobind } from "OfficeFabric/Utilities";
import { PolicyConfigurationUtils } from "Policy/Scenarios/AdminPolicies/PolicyConfigurationUtils";

// contracts
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { AutomaticReviewers } from "Policy/Scripts/PolicyTypes";
import { IdentityRef } from "VSS/WebApi/Contracts";

// controls
import { IColumn, ColumnActionsMode } from "OfficeFabric/DetailsList";
import { IdentityImageWithCallout } from "VSSPreview/Flux/Components/IdentityImageWithCallout";

// scenario
import { MultiplePolicyBase, MultiplePolicyBaseProps } from "Policy/Scenarios/AdminPolicies/MultiplePolicyBase";
import { IdentityStore } from "Policy/Scenarios/AdminPolicies/Stores/IdentityStore";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface AutomaticReviewersPolicySectionContainerProps extends MultiplePolicyBaseProps {
    identityStore: IdentityStore;
}

export class AutomaticReviewersPolicySectionContainer extends MultiplePolicyBase<AutomaticReviewersPolicySectionContainerProps> {

    protected get _firstColumns(): IColumn[] { return this._columns; }

    protected readonly _columns: IColumn[] = [
        {
            key: "0",
            name: Resources.Reviewers,
            onRender: this._renderFacepile,
            fieldName: null,
            minWidth: 180,
            maxWidth: 210,
            className: "reviewers-policy-list-column-facepile",
            columnActionsMode: ColumnActionsMode.disabled,
        },
        {
            key: "1",
            name: Resources.Requirement,
            onRender: MultiplePolicyBase._renderRequirement,
            fieldName: null,
            minWidth: 65,
            maxWidth: 90,
            className: "reviewers-policy-list-column-requirement",
            columnActionsMode: ColumnActionsMode.disabled,
        },
        {
            key: "2",
            name: Resources.PathFilter,
            onRender: MultiplePolicyBase._renderFilenamePatterns,
            fieldName: null,
            minWidth: 320,
            maxWidth: 482,
            className: "policy-list-column-pathFilter",
            columnActionsMode: ColumnActionsMode.disabled,
        },
    ];

    @autobind
    private _renderFacepile(config: PolicyConfiguration): JSX.Element {
        let reviewerIds = (config.settings as AutomaticReviewers.Settings).requiredReviewerIds;

        const identityStore = this.props.identityStore;

        let identities = reviewerIds.map((reviewerId) => {
            return identityStore.getIdentity(reviewerId) || identityStore.unknownIdentity;
        });

        const MAX_FACES = 5;

        let overflowFaces: IdentityRef[];

        if (identities.length > MAX_FACES) {
            overflowFaces = identities.splice(MAX_FACES - 1);
        }

        let items: JSX.Element[];

        items = identities.map((identity, index) =>
            <li key={index}>
                <IdentityImageWithCallout
                    imageSize="small"
                    identities={[identity]}
                    includeDisplayName={(reviewerIds.length === 1)}
                />
            </li>
        );

        if (overflowFaces) {
            items.push(
                <li key="overflow">
                    <IdentityImageWithCallout
                        imageSize="small"
                        identities={overflowFaces}
                    />
                </li>
            );
        }

        return (
            <ul aria-label={Resources.ReviewerFacepileLabel}>
                {items}
            </ul>
        );
    }

    @autobind
    protected _createNewConfig(): PolicyConfiguration {
        return PolicyConfigurationUtils.getEmptyAutomaticReviewersPolicyConfig();
    }

    // These 3 methods are not really necessary right now, or perhaps ever. Once we cache an identity it never gets reloaded,
    /// so these will never actually do anything under the current design. It's more technically correct, however.

    public componentDidMount(): void {
        this.props.identityStore.addChangedListener(this._forceUpdate);
    }

    public componentWillUnmount(): void {
        this.props.identityStore.removeChangedListener(this._forceUpdate);
    }

    @autobind
    private _forceUpdate(): void {
        this.forceUpdate();
    }

    public get policyTypeId(): string {
        return AutomaticReviewers.Id;
    }

    protected get _policyListClassName(): string {
        return "reviewers-policy-list";
    }

    protected get _overallSectionLabel(): string {
        return Resources.AutomaticReviewersSectionLabel;
    }

    protected get _overallHeadingText(): string {
        return Resources.AutomaticReviewersEnableText;
    }

    protected get _overallHeadingDetail(): React.ReactNode {
        return Resources.AutomaticReviewersEnableDetail;
    }

    protected get _policyListLabel(): string {
        return Resources.AutomaticReviewersListLabel;
    }

    protected get _addNewText(): string {
        return Resources.AddAutomaticReviewersPolicy;
    }
}
