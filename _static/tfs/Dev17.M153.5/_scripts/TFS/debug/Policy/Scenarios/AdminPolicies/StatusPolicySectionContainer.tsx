// libs
import * as React from "react";

// utils
import { PolicyConfigurationUtils } from "Policy/Scenarios/AdminPolicies/PolicyConfigurationUtils";

// contracts
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { Status } from "Policy/Scripts/PolicyTypes";

// controls
import { IColumn, ColumnActionsMode } from "OfficeFabric/DetailsList";
import { Link } from "OfficeFabric/Link";
import { autobind } from "OfficeFabric/Utilities";
import { IdentityImageWithCallout } from "VSSPreview/Flux/Components/IdentityImageWithCallout";

// scenario
import { IdentityStore } from "Policy/Scenarios/AdminPolicies/Stores/IdentityStore";

import { MultiplePolicyBase, MultiplePolicyBaseProps } from "Policy/Scenarios/AdminPolicies/MultiplePolicyBase";
import { StatusPolicyConfigContext } from "Policy/Scenarios/AdminPolicies/StatusPolicyConfigContext";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

import "VSS/LoaderPlugins/Css!Policy/Scenarios/AdminPolicies/StatusPolicySectionContainer";

export interface StatusPolicySectionContainerProps extends MultiplePolicyBaseProps {
    identityStore: IdentityStore;
}

export class StatusPolicySectionContainer extends MultiplePolicyBase<StatusPolicySectionContainerProps> {

    protected get _firstColumns(): IColumn[] { return this._columns; }

    protected readonly _columns: IColumn[] = [
        {
            key: "0",
            name: Resources.AuthorizedAccount,
            onRender: this._renderAuthors,
            fieldName: null,
            minWidth: 100,
            maxWidth: 210,
            isResizable: true,
            className: "status-policy-list-column-author",
            columnActionsMode: ColumnActionsMode.disabled,
        },
        {
            key: "1",
            name: Resources.Requirement,
            onRender: MultiplePolicyBase._renderRequirement,
            fieldName: null,
            minWidth: 75,
            maxWidth: 90,
            className: "policy-list-column-requirement",
            columnActionsMode: ColumnActionsMode.disabled,
        },
        {
            key: "2",
            name: Resources.PathFilter,
            onRender: MultiplePolicyBase._renderFilenamePatterns,
            fieldName: null,
            minWidth: 50,
            maxWidth: 150,
            isResizable: true,
            className: "policy-list-column-pathFilter",
            columnActionsMode: ColumnActionsMode.disabled,
        },
        {
            key: "3",
            name: Resources.StatusPolicyExpiration,
            onRender: this._renderExpiration,
            fieldName: null,
            minWidth: 115,
            maxWidth: 115,
            className: "build-policy-list-column-expiration",
            columnActionsMode: ColumnActionsMode.disabled,
        },
        {
            key: "4",
            name: Resources.StatusPolicyContextName,
            onRender: this._renderStatusContext,
            fieldName: null,
            minWidth: 50,
            maxWidth: 200,
            isResizable: true,
            className: "status-policy-list-column-context",
            columnActionsMode: ColumnActionsMode.disabled,
        },
    ];

    @autobind
    private _renderAuthors(config: PolicyConfiguration): JSX.Element {
        const { authorId } = config.settings as Status.Settings;

        if (!authorId) {
            return <span>{Resources.AnyAccount}</span>;
        }

        const identityStore = this.props.identityStore;
        const identity = identityStore.getIdentity(authorId) || identityStore.unknownIdentity;

        const item: JSX.Element = (
            <li key={0}>
                <IdentityImageWithCallout
                    imageSize="small"
                    identities={[identity]}
                    includeDisplayName={true} />
            </li>);

        return (
            <ul aria-label={Resources.StatusPolicyAuthorsLabel}>
                {item}
            </ul>
        );
    }

    @autobind
    private _renderStatusContext(config: PolicyConfiguration): JSX.Element {
        return <StatusPolicyConfigContext config={config} />;
    }

    @autobind
    private _renderExpiration(config: PolicyConfiguration): JSX.Element {
        const { invalidateOnSourceUpdate } = config.settings as Status.Settings;
        const expiration = invalidateOnSourceUpdate ? Resources.StatusPolicyListExpirationOnSourceUpdate : Resources.Never;
        return <span>{expiration}</span>;
    }

    @autobind
    protected _createNewConfig(): PolicyConfiguration {
        return PolicyConfigurationUtils.getEmptyStatusPolicyConfig();
    }

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
        return Status.Id;
    }

    protected get _policyListClassName(): string {
        return "status-policy-list";
    }

    protected get _overallSectionLabel(): string {
        return Resources.StatusPolicySectionLabel;
    }

    protected get _overallHeadingText(): string {
        return Resources.StatusPolicyEnableText;
    }

    protected get _overallHeadingDetail(): React.ReactNode {
        return <div className="status-policy-section-details">
            <span>{Resources.StatusPolicyEnableDetail}</span>
            <Link className="info-link learn-more-link" href="https://go.microsoft.com/fwlink/?linkid=857158" target="_blank" rel="noopener noreferrer">
                {Resources.LearnMore}
            </Link>
        </div>;
    }

    protected get _policyListLabel(): string {
        return Resources.StatusPolicyListLabel;
    }

    protected get _addNewText(): string {
        return Resources.StatusPolicyAddText;
    }
}
