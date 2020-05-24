/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { BadgeUrlCopyButton } from "CIWorkflow/Scripts/Scenarios/Definition/Components/BadgeUrlCopyButton";
import { BuildDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildDefinitionStore";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { BuildDefinition } from "TFS/Build/Contracts";

import * as Utils_Clipboard from "VSS/Utils/Clipboard";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Task/TaskInput";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/StatusBadgeProperties";

export interface IStatusBadgeState {
    statusBadgeImageUrl: string;    // separate from statusBadgeUrl because we don't want to update the rendered image until the definition is saved
    statusBadgeUrl: string;
    branchStatusBadgeUrl: string;
    statusBadgeMarkdown: string;
}

export class StatusBadgeProperties extends Component<IProps, IStatusBadgeState> {
    private _store: BuildDefinitionStore;
    private _actions: Actions.BuildDefinitionActions;

    public constructor(props: IProps) {
        super(props);

        this._store = StoreManager.GetStore<BuildDefinitionStore>(BuildDefinitionStore);
        this._store.addChangedListener(this._onChange);

        this._actions = ActionsHubManager.GetActionsHub<Actions.BuildDefinitionActions>(Actions.BuildDefinitionActions);
        this._actions.changeName.addListener(this._onChange);

        this.state = this._createState();
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChange);
        this._actions.changeName.removeListener(this._onChange);
    }

    public render(): JSX.Element {
        return (
            <div>
                <img
                    className="status-badge-image"
                    src={this.state.statusBadgeImageUrl}
                    alt={Resources.StatusBadgeImageAltText} />

                <div className="status-badge-props">
                    <StringInputComponent
                        cssClass="status-badge-url-textfield task-input-buttons"
                        label={Resources.StatusBadgeUrlLabel}
                        value={this.state.statusBadgeUrl}
                        readOnly={true} />
                    <BadgeUrlCopyButton
                        onClick={this._copyBadgeUrlToClipboard} />
                </div>

                <div className="status-badge-props">
                    <StringInputComponent
                        cssClass="status-badge-url-textfield task-input-buttons"
                        label={Resources.StatusBadgeBranchExampleUrlLabel}
                        value={this.state.branchStatusBadgeUrl}
                        readOnly={true} />
                    <BadgeUrlCopyButton
                        onClick={this._copyBranchExampleBadgeUrlToClipboard} />
                </div>

                <div className="status-badge-props">
                    <StringInputComponent
                        cssClass="status-badge-url-textfield task-input-buttons"
                        label={Resources.StatusBadgeMarkdownLinkLabel}
                        value={this.state.statusBadgeMarkdown}
                        readOnly={true} />
                    <BadgeUrlCopyButton
                        onClick={this._copyStatusBadgeMarkdownLinkToClipboard} />
                </div>

            </div>
        );
    }

    private _copyBadgeUrlToClipboard = () => {
        Utils_Clipboard.copyToClipboard(this.state.statusBadgeUrl);
    }

    private _copyBranchExampleBadgeUrlToClipboard = () => {
        Utils_Clipboard.copyToClipboard(this.state.branchStatusBadgeUrl);
    }

    private _copyStatusBadgeMarkdownLinkToClipboard = () => {
        Utils_Clipboard.copyToClipboard(this.state.statusBadgeMarkdown);
    }

    private _createState(): IStatusBadgeState {
        const buildStatusUrls = this._store.getBuildStatusUrls();
        const branchStatusBadgeUrl = buildStatusUrls.statusBadgeUrl + "?branchName=master";
        const statusBadgeMarkdown = "[![" + Resources.BuildStatus + "](" + buildStatusUrls.statusBadgeUrl + ")](" + buildStatusUrls.latestBuildUrl + ")";

        return {
            statusBadgeImageUrl: buildStatusUrls.currentStatusBadgeUrl,
            statusBadgeUrl: buildStatusUrls.statusBadgeUrl,
            branchStatusBadgeUrl,
            statusBadgeMarkdown
        };
    }

    private _onChange = () => {
        this.setState(this._createState());
    }
}
