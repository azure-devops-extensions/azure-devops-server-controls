
import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { ItemKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { RetentionPolicyItemOverview } from "CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyItemOverview";
import { RetentionPolicyStore } from "CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyStore";
import { RetentionPolicyView } from "CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyView";

import { Item } from "DistributedTaskControls/Common/Item";
import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as Navigation_Services from "VSS/Navigation/Services";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Retention/MaximumPolicyItem";

export class MaximumRetentionPolicyItem implements Item {

    private _overView: JSX.Element;
    private _details: JSX.Element;
    private _uniquePolicyInstanceId: string;
    private _isHosted: boolean;
    private _projectName: string;
    private _maximumBuildRetentionLink: string;
    private _maximumTestRetentionLink: string;

    private static readonly PIPE_SEPARATOR = "|";
    private static readonly RETENTION = "retention";
    private static readonly BUILD_QUEUE = "BuildQueue";
    private static readonly SETTINGS = "settings";
    private static readonly TEST_MANAGEMENT = "testmanagement";
    private static readonly ADMIN = "admin";

    constructor(private _policyStore: DataStoreBase) {
        this._uniquePolicyInstanceId = this._policyStore.getInstanceId();
        this._initialize();
    }

    public getOverview(instanceId?: string): JSX.Element {
        this._overView = (
            <div className="ci-maximum-retention-policy-item-overview">
                <RetentionPolicyItemOverview
                    key={this.getKey()}
                    item={this}
                    policyInstanceId={this._uniquePolicyInstanceId}
                    instanceId={instanceId}
                    subText={Resources.Maximum}
                    iconClassName="bowtie-icon bowtie-security-lock-fill"
                    isDraggable={false} />
            </div>
        );
        return this._overView;
    }

    public getDetails(): JSX.Element {
        if (!this._details) {
            this._details = (
                <div>
                    <RetentionPolicyView
                        key={this.getKey()}
                        policyInstanceId={this._uniquePolicyInstanceId}
                        hideBranchFilters={true}
                        heading={Resources.SettingsLabel}
                        disabled={true} />

                    { /* Maximum retention policy editor links for default retention policy */
                        !this._isHosted &&
                        this._renderMaximumRetentionPolicyLinks()
                    }
                </div>
            );
        }

        return this._details;
    }

    public getKey(): string {
        return this._uniquePolicyInstanceId;
    }

    public getStore(): DataStoreBase {
        return this._policyStore;
    }

    private _initialize(): void {
        this._isHosted = TfsContext.getDefault().isHosted;

        if (!this._isHosted) {
            this._projectName = TfsContext.getDefault().navigation.project;
            this._maximumBuildRetentionLink = this._getRetentionSettingsUrl(MaximumRetentionPolicyItem.BUILD_QUEUE, Utils_String.empty, MaximumRetentionPolicyItem.SETTINGS);
            this._maximumTestRetentionLink = this._getRetentionSettingsUrl(MaximumRetentionPolicyItem.TEST_MANAGEMENT, this._projectName, MaximumRetentionPolicyItem.RETENTION);
        }
    }

    private _renderMaximumRetentionPolicyLinks(): JSX.Element {
        return (
            <div className="ci-maximum-retention-policy-edit-link-container">

                {Resources.EditMaximumRetentionPolicy}

                <SafeLink
                    href={this._maximumBuildRetentionLink}
                    allowRelative={true}
                    target="_blank"
                    className="ci-maximum-retention-policy-edit-link">
                    {Resources.Build}
                </SafeLink>

                { MaximumRetentionPolicyItem.PIPE_SEPARATOR }

                <SafeLink
                    href={this._maximumTestRetentionLink}
                    allowRelative={true}
                    target="_blank"
                    className="ci-maximum-retention-policy-edit-link">
                    {Resources.Test}
                </SafeLink>

            </div>);
    }

    private _getRetentionSettingsUrl(controller: string, project: string, action: string): string {
        let tfsContext = TfsContext.getDefault();
        let actionUrl: string = tfsContext.getActionUrl(null, controller, { project: project, area: MaximumRetentionPolicyItem.ADMIN }) + Navigation_Services.getHistoryService().getFragmentActionLink(action);
        return actionUrl;
    }
}
