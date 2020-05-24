import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { AppContext } from "DistributedTaskControls/Common/AppContext";
import { Component, IProps, IStateless } from "DistributedTaskControls/Common/Components/Base";
import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";
import { TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import { Item } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Store as ItemSelectionStore } from "DistributedTaskControls/Stores/ItemSelectionStore";

import { FavoriteStar } from "Favorites/Controls/FavoriteStar";
import { canUseFavorites } from "Favorites/FavoritesService";

import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { css } from "OfficeFabric/Utilities";

import { ActiveReleasesActionCreator } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesActionCreator";
import { PipelineReleaseApproval, ReleaseDeployment, ReleaseOperationStatus } from "PipelineWorkflow/Scripts/Common/Types";
import { IActiveDefinitionReference } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import { FavoritesActionsCreator } from "PipelineWorkflow/Scripts/Definitions/Favorites/FavoritesActionsCreator";
import { DeploymentUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DeploymentUtils";
import { DefinitionsHubTelemetry, Source } from "PipelineWorkflow/Scripts/Definitions/Utils/TelemetryUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { IdentityHelper } from "PipelineWorkflow/Scripts/Shared/Utils/IdentityHelper";
import { DeploymentStatus } from "ReleaseManagement/Core/Contracts";

import { getService as getUserService, UserClaims } from "VSS/User/Services";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Core from "VSS/Utils/Core";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsContent";
import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/Deployment";

export interface IPanelItemProps extends IProps {
    item: Item;
    definition: IActiveDefinitionReference;
    showSubtitle: boolean;
    favoriteInProgressId?: number;
    isRecentSection?: boolean;
}

export class ActiveDefinitionsPanelItemOverview extends Component<IPanelItemProps, IStateless>{

	constructor(props: IPanelItemProps) {
		super(props);
		this._favoritesActionCreator = ActionCreatorManager.GetActionCreator<FavoritesActionsCreator>(FavoritesActionsCreator);
		this._activeReleasesActionCreator = ActionCreatorManager.GetActionCreator<ActiveReleasesActionCreator>(ActiveReleasesActionCreator);
	}

	public componentDidMount(): void {
		if (this.props.favoriteInProgressId && this.props.favoriteInProgressId === this.props.definition.id) {
			if (this.props.isRecentSection) {
				const placeHolderPlace = this._getItemPlaceHolder(this._itemReference);
				const elementPlace = this._itemReference.getBoundingClientRect().top;
				this._itemReference.setAttribute("style", "transform:translateY(" + (placeHolderPlace - elementPlace + "px)"));
			} else {
				// this timeout has to be same as .favoriting-in-progress transition time
				this._favoriteCompletionTimeout = Utils_Core.delay(this, 500, () => {
					this._favoriteCompletionTimeout = null;
					this._favoritesActionCreator.completeFavoriteAddition(this.props.definition.id);
				});
			}
		}
	}

	public componentWillUnmount(): void {
		if (this._favoriteCompletionTimeout) {
			this._favoritesActionCreator.completeFavoriteAddition(this.props.definition.id);
			this._favoriteCompletionTimeout.cancel();
		}
	}

    public componentWillReceiveProps(nextProps: IPanelItemProps): void {
        if (this.props.favoriteInProgressId !== nextProps.favoriteInProgressId) {
            this._itemReference.removeAttribute("style");
        }
    }

    public render(): JSX.Element {
        return (
            <div className={css("active-release-left-pane-rd-container", {
                "favoriting-placeholder": (!this.props.isRecentSection && this.props.favoriteInProgressId === this.props.definition.id),
                "favoriting-in-progress": (this.props.isRecentSection && this.props.favoriteInProgressId === this.props.definition.id)
            })}
                ref={this._resolveRef("_itemReference")}>
                <TwoPanelOverviewComponent
                    cssClass="active-release-left-pane-item-overview"
                    instanceId={this.props.instanceId}
                    overviewDescription={Utils_String.format("{0} {1}", this.props.definition.name, this._getAriaDescription())}
                    canParticipateInMultiSelect={false}
                    isDraggable={false}
                    item={this.props.item}
                    title={this.props.definition.name}
                    ariaDescription={this.props.definition.name}
                    view={this._getView()}
                    controlSection={this._getControlSection()}
                />
            </div>
        );
    }

    private _getItemPlaceHolder(element: HTMLElement): number {
        let parentElement: HTMLElement;
        if (element.parentElement) {
            parentElement = element.parentElement;
            if (parentElement.className.indexOf("active-definition-section-overview") > -1) {
                return parentElement.getBoundingClientRect().top;
            } else {
                return this._getItemPlaceHolder(parentElement);
            }
        }
    }

	private _getControlSection(): JSX.Element {
		if (!canUseFavorites()) {
			return null;
		}
		const isFavorite: boolean = !!this.props.definition.favoriteId;

		return (
			<FavoriteStar
				isFavorite={isFavorite}
				isDeleted={false}
				className={css("active-definitions-favorite-star", { "active-definitions-favorite-star-filled": isFavorite })}
				onToggle={() => {
					// Temporarily commenting out this code till we implement animation
					//this._itemSelectionStore = StoreManager.GetStore<ItemSelectionStore>(ItemSelectionStore);
					//const selectedItem: Item = this._itemSelectionStore.getSelectedItem();
					if (!!this.props.definition.favoriteId) {
						DefinitionsHubTelemetry.DefinitionUnFavorited(Source.ActiveDefinitionsCommandBar);
						this._favoritesActionCreator.removeFavorite(this.props.definition.favoriteId, this.props.definition.id/*, selectedItem*/);
					}
					else {
						DefinitionsHubTelemetry.DefinitionFavorited(Source.ActiveDefinitionsCommandBar);
						this._favoritesActionCreator.addFavorite(this.props.definition.id, this.props.definition.name/*, selectedItem*/);
						// For a Rd favorited from search view (i.e when showSubtitle is false) fetch last deployment
						if (!this.props.showSubtitle) {
							this._activeReleasesActionCreator.fetchLastDeploymentForFavoritedRd(this.props.definition.id);
						}
					}
				}}
			/>);
	}

    private _getView(): JSX.Element {
        if (this.props.showSubtitle) {
            if (this.props.definition && this.props.definition.pendingApproval) {
                return this._getPendingApprovalView(this.props.definition.pendingApproval);
            }
            else if (this.props.definition && this.props.definition.lastDeployment) {
                return this._getLastDeploymentView(this.props.definition.lastDeployment);
            }
            else {
                return (<span className="active-rd-subtext no-deployments"> {Resources.NoDeploymentText} </span>);
            }
        }
        else {
            return null;
        }
    }

    private _getPendingApprovalView(approval: PipelineReleaseApproval): JSX.Element {
        const pendingApprovalDate: string = approval && approval.createdOn ? new FriendlyDate(new Date(approval.createdOn), PastDateMode.since, true, null, false, false, null, null, true).toString() : null;
        const pendingApprovalDateTooltipText: string = approval && approval.createdOn ? approval.createdOn.toDateString() : Utils_String.empty;
        const pendingApprovalEnvironmentName: string = approval && approval.releaseEnvironment ? approval.releaseEnvironment.name : Utils_String.empty;
        // For automated approvals, they are first created in pending state although there is no approver, this might cause null reference errors for approval.approver when signalR updates are received
        const isPendingOnMe: boolean = approval.approver ? IdentityHelper.isThisMe(approval.approver.id) : false;
        let pendingApprovalSubtext: string = isPendingOnMe ? Resources.PendingYourApprovalSubtext : Resources.PendingApprovalSubtext;

        return (
            <div className={"active-rd-subtext"}>
                <div className={"active-rd-pending-approval-text-container"}>
                    <VssIcon iconType={VssIconType.bowtie} iconName="bowtie-user pending-approval-rd-identity-image" />
                    <TooltipHost hostClassName={"active-rd-approval-subtext"} content={pendingApprovalSubtext} directionalHint={DirectionalHint.bottomCenter} overflowMode={TooltipOverflowMode.Self}>
                        {pendingApprovalSubtext}
                    </TooltipHost>
                </div>
                <TooltipHost hostClassName={"active-rd-time-tooltip"} content={pendingApprovalDateTooltipText} directionalHint={DirectionalHint.rightCenter}>
                    <span className={css("active-rd-subtitle-time", "active-rd-subtitle-approval-time")}>{pendingApprovalDate}</span>
                </TooltipHost>
            </div>
        );
    }

    private _getLastDeploymentView(deployment: ReleaseDeployment): JSX.Element {
        const deploymentStartedTime: string = new FriendlyDate(new Date(deployment.lastModifiedOn), PastDateMode.ago, true, null, false, false, null, null, true).toString();
        const deploymentStartedTimeTooltipText: string = deployment && deployment.lastModifiedOn ? deployment.lastModifiedOn.toDateString() : Utils_String.empty;
        const isPendingManualIntervention: boolean = deployment && deployment.operationStatus ? deployment.operationStatus === ReleaseOperationStatus.ManualInterventionPending : false;
        const iconClass: string = DeploymentUtils.getDeploymentIcon(deployment);
        const fontClass: string = DeploymentUtils.getClassForBackgroudColor(deployment);
        const environmentName: string = deployment && deployment.releaseEnvironment ? deployment.releaseEnvironment.name : Utils_String.empty;
        if (isPendingManualIntervention) {
            return this._getPendingManualInterventionSubtext(deploymentStartedTimeTooltipText, deploymentStartedTime);
        }
        else {
            return this._getLastDeploymentSubtext(environmentName, deploymentStartedTimeTooltipText, deploymentStartedTime, iconClass, fontClass);
        }
    }

    private _getPendingManualInterventionSubtext(deploymentStartedTimeTooltipText: string, deploymentStartedTime: string): JSX.Element {
        return (
            <div className={"active-rd-subtext"}>
                <div className={"active-rd-pending-intervention-text-container"}>
                    <VssIcon iconType={VssIconType.bowtie} iconName="bowtie-status-waiting pending-intervention-rd-identity-image" />
                    <TooltipHost hostClassName={"active-rd-intervention-subtext"} content={Resources.PendingIntervention} directionalHint={DirectionalHint.bottomCenter} overflowMode={TooltipOverflowMode.Self}>
                        {Resources.PendingIntervention}
                    </TooltipHost>
                </div>
                <TooltipHost hostClassName={"active-rd-time-tooltip"} content={deploymentStartedTimeTooltipText} directionalHint={DirectionalHint.rightCenter}>
                    <span className={css("active-rd-subtitle-time", "active-rd-subtitle-intervention-time")}>{deploymentStartedTime}</span>
                </TooltipHost>
            </div>
        );
    }

    private _getLastDeploymentSubtext(environmentName: string, deploymentStartedTimeTooltipText: string, deploymentStartedTime: string, iconClass: string, fontClass: string): JSX.Element {
        return (
            <div className={"active-rd-subtext"}>
                <span className={css("active-rd-left-pane-status-icon", iconClass, fontClass)} />
                <div className={css("last-deployment-environment-name", fontClass)}>
                    <TooltipHost hostClassName={"active-rd-environment-name-tooltip"} content={environmentName} directionalHint={DirectionalHint.bottomCenter} overflowMode={TooltipOverflowMode.Self}>
                        {environmentName}
                    </TooltipHost>
                </div>
                <TooltipHost hostClassName={"active-rd-time-tooltip"} content={deploymentStartedTimeTooltipText} directionalHint={DirectionalHint.rightCenter}>
                    <span className={"active-rd-subtitle-time"}>{deploymentStartedTime}</span>
                </TooltipHost>
            </div>
        );
    }

    private _getPendingApprovalTooltipText(envName: string, date: string): string {
        return (Utils_String.localeFormat("{0} - {1} {2}", envName, Resources.PendingApprovalSubtext, date));
    }

    private _getLastDeploymentTooltipText(envName: string, date: string): string {
        return (Utils_String.localeFormat("{0} {1}", envName, date));
    }

    private _getAriaDescription(): string {
        if (this.props.showSubtitle) {
            if (this.props.definition && this.props.definition.pendingApproval) {
                return this._getPendingApprovalDescription(this.props.definition.pendingApproval);
            }
            else if (this.props.definition && this.props.definition.lastDeployment) {
                const deployment = this.props.definition.lastDeployment;
                const isPendingManualIntervention: boolean = deployment.operationStatus === ReleaseOperationStatus.ManualInterventionPending;
                if (isPendingManualIntervention) {
                    return this._getPendingInterventionDescription(deployment);
                }
                else {
                    return this._getLastDeploymentDescription(deployment);
                }
            }
            else {
                return (Resources.NoDeploymentText);
            }
        }
        else {
            return Utils_String.empty;
        }
    }

    private _getPendingApprovalDescription(approval: PipelineReleaseApproval): string {
        const pendingApprovalDate: string = approval && approval.createdOn ? new FriendlyDate(new Date(approval.createdOn), PastDateMode.since, true).toString() : null;
        const pendingApprovalEnvironmentName: string = approval && approval.releaseEnvironment ? approval.releaseEnvironment.name : Utils_String.empty;

        return Utils_String.format("{0} {1} {2}", Resources.PendingApprovalSubtext, pendingApprovalEnvironmentName, pendingApprovalDate);
    }

    private _getLastDeploymentDescription(deployment: ReleaseDeployment): string {
        const deploymentStatusText: string = DeploymentStatus[deployment.deploymentStatus];
        const deploymentStartedTime: string = new FriendlyDate(new Date(deployment.lastModifiedOn), PastDateMode.ago, true).toString();
        const environmentName: string = deployment.releaseEnvironment ? deployment.releaseEnvironment.name : Utils_String.empty;

        return Utils_String.format("{0} {1} {2}", deploymentStatusText, environmentName, deploymentStartedTime);
    }

    private _getPendingInterventionDescription(deployment: ReleaseDeployment): string {
        const deploymentStartedTime: string = new FriendlyDate(new Date(deployment.lastModifiedOn), PastDateMode.ago, true, null, false, false, null, null, true).toString();
        const environmentName: string = deployment.releaseEnvironment ? deployment.releaseEnvironment.name : Utils_String.empty;

        return Utils_String.format("{0} {1} {2}", Resources.PendingIntervention, environmentName, deploymentStartedTime);
    }

	private _favoritesActionCreator: FavoritesActionsCreator;
	private _activeReleasesActionCreator: ActiveReleasesActionCreator;
	private _itemSelectionStore: ItemSelectionStore;
	private _itemReference: HTMLDivElement;
	private _favoriteCompletionTimeout: Utils_Core.DelayedFunction;
}