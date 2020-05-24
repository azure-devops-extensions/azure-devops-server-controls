import { Actions, ItemInformation } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import { SelectDefinitionItem } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/SelectDefinitionItem";
import { ActiveDefinitionsActionsHub } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsActions";
import { ActiveDefinitionsPanelItem } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsPanelItem";
import { ActiveDefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsStore";
import { IDashboardEntry } from "PipelineWorkflow/Scripts/Definitions/AllDefinitionsContent";
import { DashboardsStore } from "PipelineWorkflow/Scripts/Definitions/Dashboards/DashboardsStore";
import { DefinitionsActionsHub } from "PipelineWorkflow/Scripts/Definitions/DefinitionsActions";
import { IDefinitionsHubState } from "PipelineWorkflow/Scripts/Definitions/DefinitionsHub";
import { DefinitionsStoreKeys, DefinitionsHubKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { IActiveDefinitionReference } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import { CommonDefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/Stores/CommonDefinitionsStore";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import { SecurityUtils } from "PipelineWorkflow/Scripts/Editor/Common/SecurityUtils";
import { PermissionHelper, IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { ReleaseManagementSecurityPermissions, ReleaseManagementUISecurityPermissions } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

import * as NavigationService from "VSS/Navigation/Services";
import * as Utils_String from "VSS/Utils/String";

export interface IDefinitionsHubStoreState {
	canEditDefinition: boolean;
	canCreateReleaseForSelectedDefinition: boolean;
	selectedDefinition: IActiveDefinitionReference;
	canManagePermissions: boolean;
	canCreateReleaseDefinition: boolean;
	canDeleteReleaseDefinition: boolean;
	canExportReleaseDefinition: boolean;
	canManageDefinitionPermissions: boolean;
	canViewReleaseDefinition: boolean;
	dashboardEntries: IDashboardEntry[];
	showActiveReleasesFilterBar: boolean;
}

export class DefinitionsHubStore extends StoreBase {

	constructor() {
		super();
		this._state = {
			canEditDefinition: true,
			canCreateReleaseForSelectedDefinition: true,
			selectedDefinition: null,
			canManagePermissions: true,
			canCreateReleaseDefinition: true,
			canDeleteReleaseDefinition: true,
			canExportReleaseDefinition: true,
			canManageDefinitionPermissions: true,
			canViewReleaseDefinition: true,
			dashboardEntries: [],
			showActiveReleasesFilterBar: false
		};
	}

	public static getKey(): string {
		return DefinitionsStoreKeys.StoreKey_DefinitionsHubStoreKey;
	}

	public initialize(instanceId: string): void {
		super.initialize(instanceId);

		this._commonDefinitionsStore = StoreManager.GetStore<CommonDefinitionsStore>(CommonDefinitionsStore);
		this._activeDefinitionsStore = StoreManager.GetStore<ActiveDefinitionsStore>(ActiveDefinitionsStore);
		this._dashboardsStore = StoreManager.GetStore<DashboardsStore>(DashboardsStore);
		this._itemSelectorActions = ActionsHubManager.GetActionsHub<Actions>(Actions);
		this._activeDefinitionsActionsHub = ActionsHubManager.GetActionsHub<ActiveDefinitionsActionsHub>(ActiveDefinitionsActionsHub);
		this._definitionsActionsHub = ActionsHubManager.GetActionsHub<DefinitionsActionsHub>(DefinitionsActionsHub);

		this._itemSelectorActions.selectItem.addListener(this._handleSelectItem);
		this._activeDefinitionsActionsHub.setDefaultSelectedDefinitionForDefinitionsHub.addListener(this._setDefaultSelectItem);
		this._activeDefinitionsActionsHub.toggleActiveReleasesFilterBar.addListener(this._handleReleasesFilterBarToggle);
		this._definitionsActionsHub.updateToolbarPermissions.addListener(this._updateToolbarPermissions);
		this._dashboardsStore.addChangedListener(this._setDashboardEntries);
	}

	public disposeInternal(): void {
		if (this._itemSelectorActions) {
			this._itemSelectorActions.selectItem.removeListener(this._handleSelectItem);
		}

		if (this._activeDefinitionsActionsHub) {
			this._activeDefinitionsActionsHub.setDefaultSelectedDefinitionForDefinitionsHub.removeListener(this._setDefaultSelectItem);
		}

		if (this._definitionsActionsHub) {
			this._definitionsActionsHub.updateToolbarPermissions.removeListener(this._updateToolbarPermissions);
		}

		if (this._dashboardsStore) {
			this._dashboardsStore.removeChangedListener(this._setDashboardEntries);
		}
	}

	public getHubStoreState(): IDefinitionsHubStoreState {
		return this._state;
	}

	public getSelectedPanelItemId(): number {
		if (this._state && this._state.selectedDefinition) {
			return this._state.selectedDefinition.id;
		}
		else {
			return -1;
		}
	}

	private canEditDefinition(): boolean {
		return this._readPermissionForDefinitionLevel(ReleaseManagementSecurityPermissions.EditReleaseDefinition);
	}

	private canCreateReleaseDefinition(): boolean {
		const token: string = SecurityUtils.getCompleteSecurityToken(Utils_String.empty);
		return this._readPermissionForSecurityAndCreateRd(ReleaseManagementSecurityPermissions.EditReleaseDefinition, token);
	}

	private canCreateRelease(): boolean {
		return this._readPermissionForDefinitionLevel(ReleaseManagementSecurityPermissions.QueueReleases);
	}

	private canManagePermissions(): boolean {
		const token: string = SecurityUtils.getCompleteSecurityToken(Utils_String.empty);
		return this._readPermissionForSecurityAndCreateRd(ReleaseManagementSecurityPermissions.AdministerReleasePermissions, token);
	}

	private canManageDefinitionPermissions(): boolean {
		const definition = this._state.selectedDefinition;
		if (!definition) {
			return false;
		}
		const token: string = SecurityUtils.getCompleteSecurityToken(SecurityUtils.createDefinitionSecurityToken(definition.path, definition.id));
		return this._readPermissionForSecurityAndCreateRd(ReleaseManagementSecurityPermissions.AdministerReleasePermissions, token);
	}

	private canDeleteReleaseDefinition(): boolean {
		return this._readPermissionForDefinitionLevel(ReleaseManagementSecurityPermissions.DeleteReleaseDefinition);
	}

	private canExportReleaseDefinition(): boolean {
		const permissionCollection: IPermissionCollection = this._commonDefinitionsStore.getPermissions();
		if (!permissionCollection) {
			return false;
		}

		const canExportReleaseDefinition = DefinitionsUtils.readUIPermissionFromCollection(permissionCollection, ReleaseManagementUISecurityPermissions.ExportReleaseDefinition);
		const canViewCDWorkflow = DefinitionsUtils.readUIPermissionFromCollection(permissionCollection, ReleaseManagementUISecurityPermissions.ViewCDWorkflowEditor);
		return (canExportReleaseDefinition && canViewCDWorkflow);
	}

	private canViewReleaseDefinition(): boolean {
		const permissionCollection: IPermissionCollection = this._commonDefinitionsStore.getPermissions();
		if (!permissionCollection) {
			return false;
		}

		const canViewReleaseDefinition = this._readPermissionForDefinitionLevel(ReleaseManagementSecurityPermissions.ViewReleaseDefinition);
		const canViewCDWorkflow = DefinitionsUtils.readUIPermissionFromCollection(permissionCollection, ReleaseManagementUISecurityPermissions.ViewCDWorkflowEditor);
		return (canViewReleaseDefinition && canViewCDWorkflow);
	}

	private _readPermissionForDefinitionLevel(permissionType: ReleaseManagementSecurityPermissions): boolean {
		const definition = this._state.selectedDefinition;
		const definitionPermissions: IPermissionCollection = this._commonDefinitionsStore.getPermissions();
		if (!definition || !definitionPermissions) {
			return false;
		}

		const token: string = SecurityUtils.getCompleteSecurityToken(SecurityUtils.createDefinitionSecurityToken(definition.path, definition.id));

		return DefinitionsUtils.readPermissionFromCollection(definitionPermissions, token, permissionType);
	}

	private _readPermissionForSecurityAndCreateRd(permissionType: ReleaseManagementSecurityPermissions, token: string): boolean {
		const permissions: IPermissionCollection = this._commonDefinitionsStore.getPermissions();

		return DefinitionsUtils.readPermissionFromCollection(permissions, token, permissionType);
	}

	private _setDefaultSelectItem = (): void => {
		this._state.selectedDefinition = this._activeDefinitionsStore.getDefaultSelectedDefinitionReference();
		this._setPermissions();
		this._addHistoryPointForViewReleases();
		this.emit(DefinitionsHubStore.DefinitionSelectionChangedEvent, this);
		this.emitChanged();
	}

	private _handleSelectItem = (selectedItemInformation: ItemInformation): void => {
		if (selectedItemInformation && selectedItemInformation.data) {
			const typeOfSelectedItem = selectedItemInformation.data.constructor.name;
			if (selectedItemInformation.data instanceof ActiveDefinitionsPanelItem) {
				this._state.selectedDefinition = (selectedItemInformation.data as ActiveDefinitionsPanelItem).getDefinition();
				this.emit(DefinitionsHubStore.DefinitionSelectionChangedEvent, this);
				this._setPermissions();
				this._addHistoryPointForViewReleases();
			}
			else if (selectedItemInformation.data instanceof SelectDefinitionItem) {
				NavigationService.getHistoryService().replaceHistoryPoint(
					PipelineTypes.PipelineDefinitionDesignerActions.viewReleasesAction,
					{ view: DefinitionsHubKeys.MinePivotItemKey },
					Utils_String.localeFormat(NavigationService.getDefaultPageTitleFormatString(), this._state.selectedDefinition.name),
					false,
					false);
			}

			this.emitChanged();
		}
	}

	private _setDashboardEntries = (): void => {
		this._state.dashboardEntries = this._dashboardsStore.getDashboardEntries();
		this.emitChanged();
	}

	private _setPermissions = (): void => {
		this._state.canCreateReleaseForSelectedDefinition = this.canCreateRelease();
		this._state.canDeleteReleaseDefinition = this.canDeleteReleaseDefinition();
		this._state.canEditDefinition = this.canEditDefinition();
		this._state.canExportReleaseDefinition = this.canExportReleaseDefinition();
		this._state.canManageDefinitionPermissions = this.canManageDefinitionPermissions();
		this._state.canViewReleaseDefinition = this.canViewReleaseDefinition();
	}

	private _addHistoryPointForViewReleases = (): void => {
		if (this._state.selectedDefinition) {
			NavigationService.getHistoryService().addHistoryPoint(
				PipelineTypes.PipelineDefinitionDesignerActions.viewReleasesAction,
				{ definitionId: this._state.selectedDefinition.id, view: DefinitionsHubKeys.MinePivotItemKey },
				Utils_String.localeFormat(NavigationService.getDefaultPageTitleFormatString(), this._state.selectedDefinition.name),
				false,
				false);
		}
	}

	private _updateToolbarPermissions = (permissionCollection: IPermissionCollection): void => {
		this._state.canCreateReleaseDefinition = DefinitionsUtils.readPermissionFromCollection(permissionCollection, SecurityUtils.getCompleteSecurityToken(Utils_String.empty), ReleaseManagementSecurityPermissions.EditReleaseDefinition);
		this._state.canManagePermissions = DefinitionsUtils.readPermissionFromCollection(permissionCollection, SecurityUtils.getCompleteSecurityToken(Utils_String.empty), ReleaseManagementSecurityPermissions.AdministerReleasePermissions);

		this.emitChanged();
	}

	private _handleReleasesFilterBarToggle = (showFilter: boolean): void => {
		if (this._state.showActiveReleasesFilterBar !== showFilter) {
			this._state.showActiveReleasesFilterBar = showFilter;
			this.emitChanged();
		}
	}

	private _itemSelectorActions: Actions;
	private _activeDefinitionsActionsHub: ActiveDefinitionsActionsHub;
	private _commonDefinitionsStore: CommonDefinitionsStore;
	private _activeDefinitionsStore: ActiveDefinitionsStore;
	private _dashboardsStore: DashboardsStore;
	private _state: IDefinitionsHubStoreState;
	private _definitionsActionsHub: DefinitionsActionsHub;

	public static readonly DefinitionSelectionChangedEvent = "DEFINITION_SELECTION_CHANGED_EVENT";
}