import * as React from "react";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Fabric } from "OfficeFabric/Fabric";
import { IIconProps } from "OfficeFabric/Icon";
import { css } from "OfficeFabric/Utilities";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import "VSS/LoaderPlugins/Css!VersionControl/CommitActionMenu";
import { TelemetryEventData } from "VSS/Telemetry/Services";
import * as Utils_Clipboard from "VSS/Utils/Clipboard";
import * as Utils_Core from "VSS/Utils/Core";
import * as  Utils_String from "VSS/Utils/String";
import { BrowserCheckUtils } from "VSS/Utils/UI";
import * as VSS from "VSS/VSS";
import { MoreActionsButton } from "VSSUI/ContextualMenuButton";
import { IVssContextualMenuItemProvider } from "VSSUI/VssContextualMenu";
import { ContributableMenuItemProvider } from "VSSPreview/Providers/ContributableMenuItemProvider"

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { IContributableCommitActionParams, getContributableCommitActionContext } from "VersionControl/Scenarios/Shared/ContributableCommitAction";
import * as ChangeDetailsTelemetry from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsTelemetry";
import { ContextStore } from "VersionControl/Scenarios/Shared/Stores/ContextStore";
import * as GitCreateTag_NO_REQUIRE from "VersionControl/Scenarios/Tags/CreateTags/Components/CreateTagsDialog";
import * as AsyncRefOperationActionCreator from "VersionControl/Scripts/Actions/AsyncGitOperation/AsyncRefOperationActionCreator";
import { AsyncRefOperationType } from "VersionControl/Scripts/Actions/AsyncGitOperationActions";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { OperationCompletedProps } from "VersionControl/Scripts/Components/AsyncGitOperation/AsyncGitOperationTracker";
import { AsyncRefOperationControllerView } from "VersionControl/Scripts/Components/AsyncGitOperation/AsyncRefOperationControllerView";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { GitObjectId } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import {
    CherryPickButton_HistoryCommits,
    CreateTagButton_HistoryCommits,
    NewBranchText,
    RevertButton_HistoryCommits,
    CommitMenu_CopySHA,
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as GitUIService_NO_REQUIRE from "VersionControl/Scripts/Services/GitUIService";
import { GitBranchVersionSpec, GitCommitVersionSpec, IGitRefVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { navigateToUrl } from "VersionControl/Scripts/Utils/XhrNavigationUtilsNonReact";
import { getExplorerUrl } from "VersionControl/Scripts/VersionControlUrls";

export interface CommitDetailsActionMenuProps extends CommonCommitActionMenuProps { }

export class CommitDetailsActionMenu extends React.Component<CommitDetailsActionMenuProps, {}> {

    public render(): JSX.Element {
        const repositoryContext = this.props.contextStore.getRepositoryContext() as GitRepositoryContext;
        
        return (this.props.hasCreateBranchPermissions
            || this.props.hasCreateTagPermissions
            || this.props.hasCherryPickPermissions
            || this.props.hasRevertPermissions)
            ? <CommitActionMenu
                {...this.props}
                getItems={this._getMenuItems} 
                getItemProviders={() => this._getMenuItemProviders(
                    getContributableCommitActionContext(
                        repositoryContext,
                        this.props)
                )}/>
            : null;
    }

    private _getMenuItems = (): IContextualMenuItem[] => {
        const commonMenuActions: CommonCommitActionMenu = new CommonCommitActionMenu(this.props);

        const items = [
            commonMenuActions.getCherryPickMenuItem(),
            commonMenuActions.getRevertCommit(),
            commonMenuActions.getSeparator(),
            commonMenuActions.getCreateTagOption(),
            commonMenuActions.getCreateBranchOption()
        ];

        return items.filter(item => item);
    }

    private _getMenuItemProviders(commitContext: IContributableCommitActionParams): IVssContextualMenuItemProvider[] {
        return [new ContributableMenuItemProvider(["ms.vss-code-web.git-commit-details-menu"], commitContext)];
    }
}

export interface CommitActionMenuProps extends CommonCommitActionMenuProps {
    getItems(): IContextualMenuItem[];
    getItemProviders() : IVssContextualMenuItemProvider[];
    className?: string;
}

/**
 * Component to display the actions menu for passed commit.
 */
export class CommitActionMenu extends React.Component<CommitActionMenuProps, {}> {
    private _moreActionsButtonRef: MoreActionsButton = null;

    public get moreActionsButtonRef(): MoreActionsButton {
        return this._moreActionsButtonRef;
    }

    public render(): JSX.Element {
        return (
            <div className={css("vc-commit-ellipsis-menu", this.props.className)}>
                <Fabric>
                    <MoreActionsButton
                        ref={(element: MoreActionsButton) => { this._moreActionsButtonRef = element }}
                        className={"more-actions"}
                        getItems={this._getItems}
                        getItemProviders={this.props.getItemProviders} />
                </Fabric>
                {this.props.contextStore &&
                    <AsyncRefOperationControllerView
                        repositoryContext={this.props.contextStore.getRepositoryContext() as GitRepositoryContext}
                        comment={this.props.comment}
                        commitId={this.props.commitId}
                        operationCompletedProps={this._getPrCreationProps()} />
                }
            </div>
        );
    }

    public componentWillUnmount(): void {
        this._moreActionsButtonRef = null;
        this._disposeItemsData();
    }

    private _getPrCreationProps(): OperationCompletedProps {
        const createPrProps: OperationCompletedProps = {
            primaryButtonText: VCResources.PullRequest_CreatePullRequestTitle,
            defaultButtonText: VCResources.AsyncGitOperationTracker_Close,
        };

        return createPrProps;
    }

    private _getItems = (): IContextualMenuItem[] => {
        return this.props.getItems().filter((menuItem: IContextualMenuItem) => {
            if (menuItem !== undefined) {
                menuItem.data = this.moreActionsButtonRef;
            }
            return menuItem !== undefined;
        });
    }

    private _disposeItemsData(): void {
        const items: IContextualMenuItem[] = this.props.getItems();
        for (const item of items) {
            item.data = null;
        }
    }
}

export interface CommonCommitActionMenuProps {
    commitId: GitObjectId;
    contextStore?: ContextStore;
    repositoryContext?: RepositoryContext;
    branchName?: string; // required for revert operation
    telemetryEventData?: TelemetryEventData;
    comment?: string; // required for cherry-pick operation
    path?: string; // required to navigate to selected file/folder
    hasCreateBranchPermissions?: boolean;
    hasCreateTagPermissions?: boolean;
    hasCherryPickPermissions?: boolean;
    hasRevertPermissions?: boolean;
    commentTruncated?: boolean;
}

export class CommonCommitActionMenu {
    private static MenuItemId_Revert = "menu-revert";
    private static MenuItemId_CherryPick = "menu-cherry-pick";
    private static MenuItemId_CreateBranch = "menu-create-branch";
    private static MenuItemId_CreateTag = "menu-create-tag";
    private static MenuItemId_CopyCommit_SHA = "menu-copy-commit-SHA";
    private static MenuItemId_BrowseFiles = "menu-browse-files";

    constructor(private _props: CommonCommitActionMenuProps) { }

    public getCherryPickMenuItem(): IContextualMenuItem {
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.SourceControlCherryPick)
            && this._props.contextStore
            && this._props.hasCherryPickPermissions) {
            return {
                key: CommonCommitActionMenu.MenuItemId_CherryPick,
                name: CherryPickButton_HistoryCommits,
                iconProps: this._getMenuIcon("bowtie-tfvc-shelveset"),
                onClick: this._startCherryPick,
            };
        }

        return undefined;
    }

    public getCopyCommitSHA(): IContextualMenuItem {
        return {
            key: CommonCommitActionMenu.MenuItemId_CopyCommit_SHA,
            name: CommitMenu_CopySHA,
            iconProps: this._getMenuIcon("bowtie-edit-copy"),
            onClick: this._copyCommitSha,
        };
    }

    public getBrowseFiles(): IContextualMenuItem {
        return {
            key: CommonCommitActionMenu.MenuItemId_BrowseFiles,
            name: VCResources.BrowseFiles,
            iconProps: this._getMenuIcon("bowtie-file-preview"),
            onClick: this._onBrowseFiles,
        };
    }

    public getCreateBranchOption(): IContextualMenuItem {
        return this._props.hasCreateBranchPermissions && {
            key: CommonCommitActionMenu.MenuItemId_CreateBranch,
            name: NewBranchText,
            iconProps: this._getMenuIcon("bowtie-tfvc-branch"),
            onClick: this._createBranch,
        }
    }

    public getCreateTagOption(): IContextualMenuItem {
        return this._props.hasCreateTagPermissions && {
            key: CommonCommitActionMenu.MenuItemId_CreateTag,
            name: CreateTagButton_HistoryCommits,
            iconProps: this._getMenuIcon("bowtie-tag"),
            onClick: this._createTag,
        };
    }

    public getRevertCommit(): IContextualMenuItem {
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.SourceControlRevert)
            && this._props.contextStore
            && this._props.hasRevertPermissions) {
            return {
                key: CommonCommitActionMenu.MenuItemId_Revert,
                name: RevertButton_HistoryCommits,
                iconProps: this._getMenuIcon("bowtie-edit-undo"),
                onClick: this._startRevert,
            };
        }

        return undefined;
    }

    public getSeparator(): IContextualMenuItem {
        return {
            key: "divider_1",
            name: "-",
        };
    }

    private _getMenuIcon(name: string): IIconProps {
        return { className: "bowtie-icon " + name, iconName: undefined };
    }

    private _onBrowseFiles = (event: React.MouseEvent<HTMLElement>): void => {
        const versionObj = new GitCommitVersionSpec(this._props.commitId.full);
        this._redirectToUrl(getExplorerUrl(this._getRepositoryContext(), this._props.path, null, { version: versionObj.toVersionString(), }));
    }

    private _copyCommitSha = (ev?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem): void => {
        Utils_Clipboard.copyToClipboard(this._props.commitId.full.toString());
        if (BrowserCheckUtils.isEdge()) {
            Utils_Core.delay(this, 0, () => {
                if (item
                    && item.data
                    && item.data.contextualMenuRef
                    && item.data.contextualMenuRef.refs
                    && item.data.contextualMenuRef.refs.button
                    && item.data.contextualMenuRef.refs.button.firstChild) {

                    item.data.contextualMenuRef.refs.button.firstChild.focus();
                }
            });
        }
    }

    private _startCherryPick = (): void => {
        this._publishTelemetry(ChangeDetailsTelemetry.ChangeDetailsTelemetryPropertyValues.actionMenuItemCherryPick);

        AsyncRefOperationActionCreator.ActionCreator.startDesigningAsyncRefOperation(
            this._props.contextStore.getRepositoryContext() as GitRepositoryContext,
            this._props.commitId.short,
            Utils_String.format(VCResources.CherryPickDialog_Title_Commit, this._props.commitId.short),
            AsyncRefOperationType.CherryPick);
    }

    private _startRevert = (): void => {
        this._publishTelemetry(ChangeDetailsTelemetry.ChangeDetailsTelemetryPropertyValues.actionMenuItemRevert);

        AsyncRefOperationActionCreator.ActionCreator.startDesigningAsyncRefOperation(
            this._props.contextStore.getRepositoryContext() as GitRepositoryContext,
            this._props.commitId.short,
            Utils_String.format(VCResources.RevertDialog_Title_Commit, this._props.commitId.short),
            AsyncRefOperationType.Revert,
            this._getDefaultOntoBranchForRevertCommit(),
        );
    }

    private _createBranch = (): void => {
        this._publishTelemetry(ChangeDetailsTelemetry.ChangeDetailsTelemetryPropertyValues.actionMenuItemNewBranch);

        VSS.using(["VersionControl/Scripts/Services/GitUIService"],
            (_GitUIService: typeof GitUIService_NO_REQUIRE) => {
                const gitUIService = _GitUIService.getGitUIService(this._getRepositoryContext() as GitRepositoryContext);
                const createBranchOptions = {
                    sourceRef: new GitCommitVersionSpec(this._props.commitId.full),
                    suggestedFriendlyName: "branch-from-" + this._props.commitId.short,
                } as GitUIService_NO_REQUIRE.ICreateBranchOptions;

                gitUIService.createBranch(createBranchOptions).then(this._onBranchCreated);
            });
    }

    private _createTag = (): void => {
        this._publishTelemetry(ChangeDetailsTelemetry.ChangeDetailsTelemetryPropertyValues.actionMenuItemNewTag);
        let viewName: string = null;
        if (this._props.telemetryEventData) {
            viewName = this._props.telemetryEventData["view"] || this._props.telemetryEventData["View"] || "";
        }

        VSS.using(
            ["VersionControl/Scenarios/Tags/CreateTags/Components/CreateTagsDialog"],
            (GitCreateTag: typeof GitCreateTag_NO_REQUIRE) => {
                GitCreateTag.CreateTagsDialog.show({
                    version: new GitCommitVersionSpec(this._props.commitId.full),
                    repositoryContext: this._getRepositoryContext() as GitRepositoryContext,
                    initliazedFromView: viewName,
                });
            });
    }

    private _getDefaultOntoBranchForRevertCommit = (): IGitRefVersionSpec => {
        let defaultOntoBranch: IGitRefVersionSpec = null;
        // populate revert commit dialog branch option with the branch name
        // shown on change details page which contains the given commit
        if (this._props.branchName) {
            defaultOntoBranch = new GitBranchVersionSpec(this._props.branchName);
        }

        return defaultOntoBranch;
    }

    private _onBranchCreated = (result: GitUIService_NO_REQUIRE.ICreateBranchResult): void => {
        if (result.cancelled) {
            return;
        }

        const explorerUrl = getExplorerUrl(this._getRepositoryContext(), null, null, {
            version: new GitBranchVersionSpec(result.selectedFriendlyName).toVersionString(),
        });

        this._redirectToUrl(explorerUrl);
    }

    private _getRepositoryContext = (): RepositoryContext => {
        if (this._props.contextStore) {
            return this._props.contextStore.getRepositoryContext();
        }
        else if (this._props.repositoryContext) {
            return this._props.repositoryContext;
        }
        return null;
    }

    private _redirectToUrl = (url: string): void => {
        navigateToUrl(url, CodeHubContributionIds.gitFilesHub);
    }

    // public only for UT
    public _publishTelemetry = (menuItemName: string): void => {
        const ciData = ChangeDetailsTelemetry.getCustomerIntelligenceData(this._props.telemetryEventData);
        ciData.properties[ChangeDetailsTelemetry.ChangeDetailsTelemetryProperties.actionMenuItemName] = menuItemName;

        ciData.publish(ChangeDetailsTelemetry.ChangeDetailsTelemetryFeatures.contextMenuItemAction, false, CustomerIntelligenceConstants.ACTIONSOURCE_CONTEXT_MENU);
    }
}
