/// <reference types="react" />
/// <reference types="react-dom" />

import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { Link } from "OfficeFabric/Link";
import { TooltipHost } from "VSSUI/Tooltip";

import * as BranchResources from "VersionControl/Scripts/Resources/TFS.Resources.Branches";
import * as React from "react";
import { AheadBehindCount } from "VersionControl/Scenarios/Branches/Stores/StatsStore";
import { getMyBranchNames, getBranchesCompareUrlFragment } from "VersionControl/Scenarios/Branches/Components/BranchesUtils";
import { GitRef, GitUserDate, RefFavoriteType, GitRefFavorite, GitCommitRef } from "TFS/VersionControl/Contracts";
import { GitBranchContext } from "TFS/VersionControl/UIContracts";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";
import * as PullRequestUtils from "VersionControl/Scripts/PullRequestUtils";
import * as PopupMenu from "Presentation/Scripts/TFS/Components/PopupMenu";
import * as Menus from "VSS/Controls/Menus";
import { localeFormat, friendly } from "VSS/Utils/Date";
import * as VSS_Events from "VSS/Events/Services";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import { BranchStoreFactory, StoreIds } from "VersionControl/Scenarios/Branches/Stores/BranchStoreFactory";
import { BranchPermissions } from "VersionControl/Scenarios/Branches/Stores/BranchPermissionsStore";
import { GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Date from "VSS/Utils/Date";
import { createWithPermissions, SecureCommandCreator, CommandFiltering } from "VersionControl/Scenarios/Shared/Commands/CommandsCreator";
import * as Constants from "VersionControl/Scenarios/Shared/Constants";
import { getBowtieIconProps } from "VersionControl/Scenarios/Shared/IconUtils";
import { StatBadge } from "VersionControl/Scenarios/Shared/StatBadge";
import * as InjectDependency from "VersionControl/Scenarios/Shared/InjectDependency";
import { BranchMenuActions, IStateless, IEnhancedGitRef, BranchRowActions } from "VersionControl/Scenarios/Branches/Components/BranchesUtils";
import { FavoriteStatus } from "VersionControl/Scenarios/Branches/Components/FavoriteStatus";
import * as RepoContext from "VersionControl/Scenarios/Branches/Stores/RepoContextStore";
import { StatusTextIcon } from "VersionControl/Scenarios/Shared/StatusBadge"
import * as Branch from "VersionControl/Scenarios/Branches/Actions/Branch";
import { RefNameLinkInTree } from "VersionControl/Scenarios/Shared/RefTree/RefNameLinkInTree";
import Service = require("VSS/Service");
import { HubsService } from "VSS/Navigation/HubsService";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as VersionSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";;
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import * as KeyValue from "Presentation/Scripts/TFS/Stores/DictionaryStore";
import Events_Handlers = require("VSS/Events/Handlers");

export interface BranchNameColumnProperties {
    gitRef: GitRef;
    fullName: string; /* full path of branch minus ref/heads */
    isDeleted?: boolean;
    isDefault?: boolean;
    isCompare?: boolean;
    isUserCreated?: boolean;
    isNew?: boolean;
    hasPolicy?: boolean;
    highlightText?: string; /* search term */
    leaveRoomForChevrons?: boolean;
    depth?: number;
    compareBranch?: GitRef;
    compareIsMine?: boolean;
    showFullName?: boolean;
    favorite: GitRefFavorite;
    permissions: BranchPermissions
    onDeleteBranch(branch: string): void;
}

export class BranchNameColumn extends React.Component<BranchNameColumnProperties, IStateless> {
    public render() {
        if (this.props.isDeleted) {
            return (
                <span className="branches-name-cell-with-contextual-menu">
                    {this._createBranchNameComponent()}
                </span>
            );
        }
        return (
            <span className="branches-name-cell-with-contextual-menu">
                {this._createBranchNameComponent()}
                <FavoriteStatus name={this.props.gitRef.name}
                    isUserCreated={this.props.isUserCreated}
                    isDefault={this.props.isDefault}
                    isCompare={this.props.isCompare}
                    type={RefFavoriteType.Ref}
                    favorite={this.props.favorite}
                    canFavorite={this.props.permissions.updateFavorites}
                    canDelete={this.props.permissions.deleteBranch}
                    onDeleteBranch={this.props.onDeleteBranch}
                />
            </span>
        );
    }

    private _createBranchNameComponent(): JSX.Element {
        return (
            <BranchName
                gitRef={this.props.gitRef}
                fullName={this.props.fullName}
                isDeleted={this.props.isDeleted}
                isDefault={this.props.isDefault}
                isCompare={this.props.isCompare}
                isNew={this.props.isNew}
                hasPolicy={this.props.hasPolicy}
                leaveRoomForChevrons={this.props.leaveRoomForChevrons}
                depth={this.props.depth}
                highlightText={this.props.highlightText}
                compareBranch={this.props.compareBranch}
                showFullName={this.props.showFullName}
                key={"B" + this.props.gitRef.name}
                disablePolicyLink={!this.props.permissions.viewBranchPolicies} />
        );
    }
}

export interface BranchNameProperties {
    gitRef: GitRef;
    fullName: string;
    isDeleted: boolean;
    isDefault: boolean;
    isCompare: boolean;
    isNew: boolean;
    hasPolicy: boolean;
    highlightText?: string;
    leaveRoomForChevrons?: boolean;
    depth?: number;
    showFullName?: boolean;
    compareBranch: GitRef;
    key: string;
    disablePolicyLink?: boolean;
}

export class BranchName extends React.Component<BranchNameProperties, IStateless> {
    public render() {

        const chevronSpacer = (): JSX.Element => {
            if (this.props.leaveRoomForChevrons) {
                const spacerClass = this.props.depth > 0 ? "bowtie-folder" : "bowtie-chevron-right";
                return <span className={"bowtie-icon " + spacerClass + " vc-transparent-icon"}></span>;
            }
            return null;
        }

        let lockTip: string = "";
        let lockIcon: string = "";
        //We need a space to prevent an obscure bug with overlapping background styles in Arabic OS using IE (Bug 871802).
        let lockSpace: string = " ";
        if (this.props.gitRef.isLockedBy) {
            lockIcon = "bowtie-icon bowtie-security-lock";
            lockTip = Utils_String.format(BranchResources.LockedBy, this.props.gitRef.isLockedBy.displayName);
            lockSpace = "";
        }

        let policyIcon: string = "";
        let policyTip: string = "";
        if (this.props.hasPolicy) {
            policyIcon = "bowtie-icon bowtie-policy";
            policyTip = BranchResources.BranchPolicy;
        }

        const friendlyName = GitRefUtility.getRefFriendlyName(this.props.gitRef.name);

        const branchExplorerUrl = VersionControlUrls.getBranchExplorerUrl(
            BranchStoreFactory.get<RepoContext.Store>(StoreIds.REPO_CONTEXT).getRepoContext(),
            friendlyName);

        const defaultText: string = this.props.isDefault ? BranchResources.NewBranches_DefaultBranch_Label : "";
        const compareText: string = this.props.isCompare ? BranchResources.NewBranches_CompareBranch_Label : "";

        const managePolicyUrl = VersionControlUrls.getBranchPolicyUrl(
            BranchStoreFactory.get<RepoContext.Store>(StoreIds.REPO_CONTEXT).getRepoContext(),
            friendlyName);

        return (
            <span className="branches-name-cell" >
                <RefNameLinkInTree
                    refIcon="bowtie-tfvc-branch"
                    depth={this.props.depth}
                    key={this.props.fullName}
                    leaveRoomForBadge={this.props.isDefault || this.props.isCompare}
                    leaveRoomForChevrons={this.props.leaveRoomForChevrons}
                    name={this.props.gitRef.name}
                    isDeleted={this.props.isDeleted}
                    deletedRefText={Utils_String.format(BranchResources.DeletedBranch, friendlyName)}
                    highlightText={this.props.highlightText}
                    redirectUrl={branchExplorerUrl}
                    onLinkClicked={this._onBranchNameClicked.bind(this)}
                    alwaysDisplayTooltip={true}
                    showFullName={this.props.showFullName}
                />

                {this.props.isDefault &&
                    <span className={"vc-grey-branch-badge"}>{BranchResources.NewBranches_DefaultBranch_Label}</span>
                }
                {this.props.isCompare &&
                    <span className={"vc-grey-branch-badge"}>{BranchResources.NewBranches_CompareBranch_Label}</span>
                }
                {policyIcon &&
                    <Link href={managePolicyUrl} aria-label={policyTip} disabled={this.props.disablePolicyLink}>
                        <span className={policyIcon} title={policyTip} />
                    </Link>
                }
                {/* We will always show a space or the lockIcon to prevent an obscure bug with overlapping background styles in Arabic OS using IE (Bug 871802). */}
                <span className={lockIcon} title={lockTip}>{lockSpace}</span>
                {this.props.isNew &&
                    <span className={"vc-new-branch-badge"}>{BranchResources.NewBranches_NewBranch_Label}</span>
                }
            </span>
        );
    }

    private _onBranchNameClicked(event: React.MouseEvent<HTMLAnchorElement>) {
        VSS_Events.getService().fire(BranchRowActions.ExploreFiles, this);
        onClickNavigationHandler(event, "ms.vss-code-web.files-hub-git", (event.currentTarget as HTMLAnchorElement).href);
    }
}

export interface EllipsisMenuProperties {
    branch: IEnhancedGitRef;
    compareBranch: IEnhancedGitRef;
    compareIsMine: boolean;
    permissions: BranchPermissions;
    deletingBranchDelegate(branch: string): void;
}

export function getFileCommandsInContextMenu(options: EllipsisMenuProperties): IContextualMenuItem[] {
    const menuItemCreators = options.branch.ref.isDeleted ? deletedBranchMenuItemCreators : branchMenuItemCreators;
    return createWithPermissions(menuItemCreators, options.permissions, options);
}

export function hasPermissionToAnyCommand(permissions: BranchPermissions, branch: IEnhancedGitRef): boolean {
    return (branch.ref && branch.ref.isDeleted)
        ? deletedBranchMenuItemCreators.some(item => item.hasPermission(permissions))
        : branchMenuItemCreators.some(item => item.hasPermission(permissions));
}

const deletedBranchMenuItemCreators: SecureCommandCreator<BranchPermissions, EllipsisMenuProperties>[] = [
    {
        hasPermission: permissions => permissions.deleteBranch,
        getCommand: options => {
            const gitRef = options.branch.ref.gitRef;
            return {
                name: BranchResources.RestoreBranchMenuItemText,
                key: BranchMenuActions.RestoreBranch,
                ariaLabel: BranchResources.RestoreBranchMenuItemText,
                iconProps: getBowtieIconProps(Constants.bowtieRestore),
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                    VSS_Events.getService().fire(
                        BranchRowActions.Menu,
                        this,
                        new Events_Handlers.CommandEventArgs(BranchMenuActions.RestoreBranch));
                    Branch.Creators.recreateBranch(gitRef.name, gitRef.objectId, options.branch.isCompare, options.branch.isDefault);
                }
            };
        }
    }
];

const branchMenuItemCreators: SecureCommandCreator<BranchPermissions, EllipsisMenuProperties>[] = [
    {
        hasPermission: permissions => permissions.createBranch,
        getCommand: options => {
            return {
                name: BranchResources.NewBranchMenuItemText,
                key: BranchMenuActions.New,
                ariaLabel: BranchResources.NewBranchMenuItemText,
                iconProps: getBowtieIconProps(Constants.bowtieMathPlusLight),
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                    VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.New,
                        { branchName: options.branch.ref.gitRef.name, objectId: options.branch.ref.gitRef.objectId }));
                }
            };
        }
    },
    {
        hasPermission: permissions => permissions.createPullRequest,
        getCommand: options => {
            let targetRef = options.compareBranch.ref ? options.compareBranch.ref.gitRef.name : null;
            if (options.branch.pullRequest != undefined) {
                targetRef = options.branch.pullRequest.targetRefName;
            }

            return {
                key: BranchMenuActions.PullRequest,
                ariaLabel: BranchResources.PullRequestMenuItemText,
                name: BranchResources.PullRequestMenuItemText,
                iconProps: getBowtieIconProps(Constants.bowtieTfvcPullRequest),
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                    VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.PullRequest,
                        { sourceBranchName: options.branch.ref.gitRef.name, targetBranchName: targetRef }));
                }
            };
        }
    },
    {
        hasPermission: permissions => permissions.updateFavorites,
        getCommand: options => {
            const isMyFavorite: boolean = Boolean(options.branch.favorite);
            const isUserCreated: boolean = options.branch.isUserCreated;

            if (isMyFavorite || options.branch.isDefault || isUserCreated) {
                return {
                    key: BranchMenuActions.Remove_Favorite,
                    ariaLabel: BranchResources.RemoveFavoriteMenuItemText,
                    name: BranchResources.RemoveFavoriteMenuItemText,
                    iconProps: getBowtieIconProps(Constants.bowtieFavoriteOutline),
                    disabled: options.branch.isDefault || isUserCreated,
                    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                        VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.Remove_Favorite,
                            { favorite: options.branch.favorite }));
                    }
                };
            }
        }
    },
    {
        hasPermission: permissions => permissions.updateFavorites,
        getCommand: options => {
            const isMyFavorite: boolean = Boolean(options.branch.favorite);
            const isUserCreated: boolean = options.branch.isUserCreated;

            if (!isMyFavorite && !options.branch.isDefault && !isUserCreated) {
                return {
                    key: BranchMenuActions.Add_Favorite,
                    name: BranchResources.AddFavoriteMenuItemText,
                    ariaLabel: BranchResources.AddFavoriteMenuItemText,
                    iconProps: getBowtieIconProps(Constants.bowtieFavorite),
                    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                        VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.Add_Favorite,
                            { name: options.branch.ref.gitRef.name, isCompare: options.branch.isCompare, type: RefFavoriteType.Ref }));
                    }
                };
            }
        }
    },
    {
        hasPermission: permissions => permissions.deleteBranch,
        getCommand: options => {
            return {
                key: BranchMenuActions.Delete,
                name: BranchResources.DeleteBranchMenuItemText,
                ariaLabel: BranchResources.DeleteBranchMenuItemText,
                iconProps: getBowtieIconProps(Constants.bowtieTrash),
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                    VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.Delete,
                        { branchName: options.branch.item.fullName, delegate: options.deletingBranchDelegate }));
                }
            };
        }
    },
    {
        hasPermission: permissions => true,
        getCommand: options => ({
                key: `separator1`,
                name: "-",
            })
    },
    {
        hasPermission: permissions => true,
        getCommand: options => {
            return {
                key: BranchMenuActions.Explore,
                name: BranchResources.ExploreBranchMenuItemText,
                ariaLabel: BranchResources.ExploreBranchMenuItemText,
                iconProps: getBowtieIconProps(Constants.bowtieFile),
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                    VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.Explore,
                        { branchName: options.branch.ref.gitRef.name }));
                }
            };
        }
    },
    {
        hasPermission: permissions => true,
        getCommand: options => {
            return {
                key: BranchMenuActions.History,
                name: BranchResources.HistoryBranchMenuItemText,
                ariaLabel: BranchResources.HistoryBranchMenuItemText,
                iconProps: getBowtieIconProps(Constants.bowtieNavigateHistory),
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                    VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.History,
                        { branchName: options.branch.ref.gitRef.name }));
                }
            };
        }
    },
    {
        hasPermission: permissions => true,
        getCommand: options => {
            return !options.branch.isCompare && {
                key: BranchMenuActions.Compare,
                name: BranchResources.CompareBranchMenuItemText,
                ariaLabel: BranchResources.CompareBranchMenuItemText,
                iconProps: getBowtieIconProps(Constants.bowtieDiffSideBySide),
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                    VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.Compare,
                        {
                            branchName: options.branch.ref.gitRef.name,
                            compareBranchName: options.compareBranch.ref ? options.compareBranch.ref.gitRef.name : null
                        }));
                }
            };
        }
    },
    {
        hasPermission: permissions => true,
        getCommand: options => {
            return !options.branch.isCompare && {
                key: BranchMenuActions.SetCompareBranch,
                name: BranchResources.SetCompareBranchMenuItemText,
                ariaLabel: BranchResources.SetCompareBranchMenuItemText,
                iconProps: getBowtieIconProps(Constants.bowtieTfvcCompare),
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                    VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.SetCompareBranch,
                        {
                            newCompareBranch: options.branch.ref.gitRef,
                            newCompareBranchIsDefault: options.branch.isDefault,
                            oldCompareBranch: options.compareBranch.ref ? options.compareBranch.ref.gitRef : null,
                            oldCompareIsMine: options.compareIsMine,
                            oldCompareIsDefault: options.compareBranch.isDefault
                        }));
                }
            };
        }
    },
    {
        hasPermission: permissions => true,
        getCommand: options => ({
                key: `separator2`,
                name: "-",
            })
    },
    {
        hasPermission: permissions => permissions.lockBranch,
        getCommand: options => {
            const isLockedBy = options.branch.ref.gitRef.isLockedBy;
            return !isLockedBy && {
                key: BranchMenuActions.Lock,
                name: BranchResources.LockBranchMenuItemText,
                ariaLabel: BranchResources.LockBranchMenuItemText,
                iconProps: getBowtieIconProps(Constants.bowtieSecurityLock),
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                    VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.Lock,
                        { branch: options.branch.ref.gitRef }));
                }
            };
        }
    },
    {
        hasPermission: permissions => permissions.lockBranch,
        getCommand: options => {
            const isLockedBy = options.branch.ref.gitRef.isLockedBy;
            return isLockedBy && {
                key: BranchMenuActions.Unlock,
                name: BranchResources.UnlockBranchMenuItemText,
                ariaLabel: BranchResources.UnlockBranchMenuItemText,
                iconProps: getBowtieIconProps(Constants.bowtieSecurityUnlock),
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                    VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.Unlock,
                        { branch: options.branch.ref.gitRef }));
                }
            };
        }
    },
    {
        hasPermission: permissions => permissions.viewBranchPolicies,
        getCommand: options => {
            return {
                key: BranchMenuActions.BranchPolicies,
                name: BranchResources.BranchPoliciesMenuItemText,
                ariaLabel: BranchResources.BranchPoliciesMenuItemText,
                iconProps: getBowtieIconProps(Constants.bowtiePolicy),
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                    VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.BranchPolicies,
                        { branchName: options.branch.ref.gitRef.name }));
                }
            };
        }
    },
    {
        hasPermission: permissions => permissions.viewBranchSecurity,
        getCommand: options => {
            return {
                key: BranchMenuActions.BranchSecurity,
                name: BranchResources.BranchSecurityMenuItemText,
                ariaLabel: BranchResources.BranchSecurityMenuItemText,
                iconProps: getBowtieIconProps(Constants.bowtieSecurity),
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                    VSS_Events.getService().fire(BranchRowActions.Menu, this, new Events_Handlers.CommandEventArgs(BranchMenuActions.BranchSecurity,
                        { branchName: options.branch.ref.gitRef.name }));
                }
            };
        }
    }
];

interface DisplayDateProperties {
    date: Date;
    isRelative: boolean;
}

class DisplayDate extends React.Component<DisplayDateProperties, IStateless> {
    public render() {
        const fullDate = this.props.date ? localeFormat(this.props.date) : "";
        let displayText = this.props.date && this.props.isRelative ? friendly(this.props.date) : fullDate;
        if (displayText) {
            displayText = BranchResources.UpdatedText + displayText;
        } else {
            displayText = BranchResources.RecentlyUpdatedError;
        }

        return <span >{displayText}</span>;
    }
}

export interface AheadBehindProperties {
    aheadBehind: AheadBehindCount;
    compareBranchName: string;
    isCompare: boolean;
}

export class AheadBehind extends React.Component<AheadBehindProperties, IStateless> {

    private _calcBarStyle(numberOfCommits: number): string {
        let style: string = "0";
        let barLength: number = 0;

        //We allow a max of 40px and calculate (log base 10(# of commits) + 1) * 8 for a weighted distribution
        if (numberOfCommits) {
            barLength = (Math.log(numberOfCommits) / 2.303 + 1) * 8;
            barLength = barLength > 40 ? 40 : barLength;
        }
        style = barLength + "px";
        return style;
    }

    public render() {

        if (!this.props.aheadBehind || this.props.isCompare) {
            return (
                <div className="vc-column vc-ahead-behind-col vc-placeholder-only"></div>
            );
        }

        const ab = this.props.aheadBehind;

        //AheadBehindToolTip
        const tooltip = Utils_String.format(BranchResources.AheadBehindToolTip, ab.behind, ab.ahead, GitRefUtility.getRefFriendlyName(this.props.compareBranchName));

        //Calculate the length of the bar
        const aheadStyle: string = this._calcBarStyle(ab.ahead);
        const behindStyle: string = this._calcBarStyle(ab.behind);

        const branchDiffUrl = getBranchesCompareUrlFragment(
            GitRefUtility.getRefFriendlyName(this.props.compareBranchName),
            this.props.aheadBehind.name);

        return (
            <TooltipHost
                content={tooltip}
                directionalHint={DirectionalHint.bottomCenter}>
                <Link href={branchDiffUrl} aria-label={tooltip} className="vc-column vc-ahead-behind-col" >
                    <span className="ab-left">
                        <span className="ab-left-text">{ab.behind}</span>
                        <div className="ab-bar ab-left ab-bar-left"><span style={{ "width": behindStyle }}></span></div>
                    </span>
                    <span className="ab-middle">
                        <div>&nbsp;</div>
                    </span>
                    <span className="ab-right">
                        <span className="ab-right-text">{ab.ahead}</span>
                        <div className="ab-bar ab-right ab-bar-right"><span style={{ "width": aheadStyle }}></span></div>
                    </span>
                </Link>
            </TooltipHost>
        );
    }
}

export interface PullRequestProperties {
    branch: IEnhancedGitRef;
    newPullRequestCallback?: IFunctionPR<string, void>;
    compareBranch: GitRef;
    showCreate?: boolean;
}

export class PullRequest extends React.Component<PullRequestProperties, IStateless> {

    public render() {
        if (this.props.branch.pullRequest) {
            const pr = this.props.branch.pullRequest;
            const prLabel = Utils_String.format(BranchResources.PullRequestLabel, pr.pullRequestId, pr.title);
            const prTooltip = Utils_String.format(BranchResources.PullRequestTitle, prLabel,
                GitRefUtility.getRefFriendlyName(pr.sourceRefName), GitRefUtility.getRefFriendlyName(pr.targetRefName));
            const prLink = VersionControlUrls.getPullRequestUrl(
                BranchStoreFactory.get<RepoContext.Store>(StoreIds.REPO_CONTEXT).getRepoContext(),
                pr.pullRequestId);

            return <StatBadge
                iconClassName={"bowtie-tfvc-pull-request"}
                className={"ms-Link"}
                title={pr.pullRequestId.toString()}
                tooltip={prTooltip}
                url={prLink}
                onLinkClick={this._onLinkClick}
            />
        }
        else if (this.props.showCreate) {
            return <PullRequestUpsell branch={this.props.branch} newPullRequestCallback={this.props.newPullRequestCallback} compareBranch={this.props.compareBranch} />;
        }
        return (
            <div className="vc-column vc-pull-request-upsell vc-placeholder-only"></div>
        );
    }

    private _onLinkClick(event: React.MouseEvent<HTMLAnchorElement>) {
        VSS_Events.getService().fire(BranchRowActions.NewPullRequest, this);

        onClickNavigationHandler(event, "ms.vss-code-web.pull-request-hub", (event.currentTarget as HTMLAnchorElement).href);
    }
}

class PullRequestUpsell extends React.Component<PullRequestProperties, IStateless> {
    public render() {
        let upsellButton;

        const newPrUrl = VersionControlUrls.getCreatePullRequestUrl(
            BranchStoreFactory.get<RepoContext.Store>(StoreIds.REPO_CONTEXT).getRepoContext(),
            GitRefUtility.getRefFriendlyName(this.props.branch.ref.gitRef.name),
            this.props.compareBranch ? GitRefUtility.getRefFriendlyName(this.props.compareBranch.name) : null);

        if (!this.props.branch.isCompare) {
            upsellButton = <a href={newPrUrl} className="vc-pull-request" onClick={this._onLinkClick.bind(this)}>
                <span className="bowtie-icon bowtie-tfvc-pull-request"></span>
                <span className="vc-pull-request-text">{BranchResources.NewBranches_CreatePullRequestCommand_Label}</span>
            </a>;
        }
        return (
            <div>
                {upsellButton}
            </div>
        );
    }

    private _onLinkClick(event: React.MouseEvent<HTMLAnchorElement>) {
        VSS_Events.getService().fire(BranchRowActions.NewPullRequest, this);

        onClickNavigationHandler(event, "ms.vss-code-web.pull-request-hub", (event.currentTarget as HTMLAnchorElement).href);
    }
}
