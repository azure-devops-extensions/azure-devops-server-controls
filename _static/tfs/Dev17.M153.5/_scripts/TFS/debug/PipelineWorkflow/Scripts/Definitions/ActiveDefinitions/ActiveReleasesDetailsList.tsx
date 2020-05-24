import * as React from "react";
import * as ReactDOM from "react-dom";

// OfficeFabric
import { autobind, css } from "OfficeFabric/Utilities";
import { SelectionMode } from "OfficeFabric/Selection";
import { ConstrainMode, IColumn, IDetailsRowProps, DetailsRow, Selection, DetailsListLayoutMode } from "OfficeFabric/DetailsList";
import { TooltipDelay, TooltipHost, DirectionalHint, TooltipOverflowMode } from "VSSUI/Tooltip";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";

// VSS
import * as Utils_Array from "VSS/Utils/Array";
import { localeFormat } from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";
import { VssDetailsList } from "VSSUI/VssDetailsList";

// DTC
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";

// ReleasePipeline
import { Release, ReleaseStatus, ReleaseReason } from "ReleaseManagement/Core/Contracts";

// PipelineWorflow
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ActiveReleaseColumnKeys, ReleasesViewCanvasConstants } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { ActiveReleasesActionCreator } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesActionCreator";
import { ActiveReleaseNameColumn } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseNameColumn";
import { ActiveReleaseEnvironmentsColumn } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseEnvironmentsColumn";
import { ReleaseEnvironmentTileSize } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseEnvironmentNodeHelper";
import { IActiveReleasesState } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesStore";
import { ActiveReleasesMenuButton } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesMenuButton";
import { IActiveReleasesFilterState } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesFilterStore";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";

import * as RMUtilsCore from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";

import { renderDeleteReleaseDialog } from "PipelineWorkflow/Scripts/SharedComponents/Dialogs/DeleteReleaseDialog";
import { CreateReleaseEnvironmentNodeConstants } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/Constants";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionDetails";

export interface IActiveReleasesDetailsListProps extends IProps {
	releases: PipelineTypes.PipelineRelease[];
	selection: Selection;
	definitionId: number;
	envColumnWidth: number;
	releaseColumnWidth: number;
	envTileSize: ReleaseEnvironmentTileSize;
	maxEnvCanvasWidth: number;
	initialEnvColumnWidth: number;
	initialNameColumnWidth: number;
	initialArtifactNameWidth: number;
	initialBranchNameWidth: number;
	definitionEnvironmentCurrentReleaseMap: IDictionaryNumberTo<number>;
	filterState: IActiveReleasesFilterState;
	onDesiredReleaseFound?: () => void;
	releasesActionSuccessCallback?: (message: React.ReactNode) => void;
	releasesActionErrorCallback?: (message: React.ReactNode) => void;
}

export interface IActiveReleasesDetailsListViewState extends IActiveReleasesState {
	expandedRows?: number[];
	focusedRowReleaseId?: number;
	hoveredRowReleaseId?: number;
}

export class ActiveReleasesDetailsList extends Component<IActiveReleasesDetailsListProps, IActiveReleasesDetailsListViewState> {
	constructor(props) {
		super(props);

		this._activeReleasesActionCreator = ActionCreatorManager.GetActionCreator<ActiveReleasesActionCreator>(ActiveReleasesActionCreator);

		this.state = {
			expandedRows: []
		} as IActiveReleasesDetailsListViewState;

	}

	public componentDidUpdate() {
		this._isEnvironmentColumnResizing = false;
		this._isNameColumnResizing = false;
	}

	public componentWillReceiveProps(nextProps: IActiveReleasesDetailsListProps) {
		/*****************************************************************************************************
		* Details list does not let us control the widths of columns                                         *
        * It only gives the option to set a min or max width                                                 *
        * This is a hack to reset _columnOverrides on resize, expand chain or on expand release so that      *
		* the list empties the currentWidth of resized column and uses the min/max width supplied            *
        *****************************************************************************************************/
		if (this._activeReleasesDetailsList && this._activeReleasesDetailsList.detailsList && this._activeReleasesDetailsList.detailsList["_columnOverrides"]) {
			let envColWidth: number;
			if (this.state.expandedRows && this.state.expandedRows.length > 0) {
				let currentEnvColWidth: number;
				// On release expand, take max of current env column width and width required for canvas to expand fully
				if (nextProps.envColumnWidth > 0) {
					// current env column width as set in props.envColWidth on resize
					currentEnvColWidth = nextProps.envColumnWidth;
				}
				else {
					// current env column width as set in default initial env column width in props
					currentEnvColWidth = nextProps.initialEnvColumnWidth;
				}
				envColWidth = Math.max(nextProps.maxEnvCanvasWidth, currentEnvColWidth);
			}
			else if (nextProps.envColumnWidth > 0) {
				envColWidth = nextProps.envColumnWidth;
			}
			else {
				envColWidth = nextProps.initialEnvColumnWidth;
			}

			this._activeReleasesDetailsList.detailsList["_columnOverrides"][ActiveReleaseColumnKeys.ActiveReleaseEnvironmentsKey] = {
				currentWidth: envColWidth,
				calculatedWidth: envColWidth
			};

			const relColWidth: number = nextProps.releaseColumnWidth > 0 ? nextProps.releaseColumnWidth : nextProps.initialNameColumnWidth;
			if (relColWidth > 0) {
				this._activeReleasesDetailsList.detailsList["_columnOverrides"][ActiveReleaseColumnKeys.ActiveReleaseNameKey] = {
					currentWidth: relColWidth,
					calculatedWidth: relColWidth
				};
			}
		}
	}

	public render(): JSX.Element {
		return (
			<VssDetailsList
				componentRef={this._resolveRef("_activeReleasesDetailsList")}
				className={"active-releases-details-list"}
				items={this.props.releases}
				columns={this._getColumns()}
				onRenderItemColumn={this._onRenderItemColumn}
				isHeaderVisible={true}
				selectionMode={SelectionMode.single}
				selection={this.props.selection}
				getRowAriaLabel={this._getRowAriaLabel}
				onRenderRow={this._onRenderRow}
				constrainMode={ConstrainMode.unconstrained}
				getMenuItems={this._getMenuItems}
				actionsColumnKey={ActiveReleaseColumnKeys.ActiveReleaseNameKey}
				allocateSpaceForActionsButtonWhileHidden={true}
				onColumnResize={this._onColumnResize}
				onItemInvoked={this._onItemInvoked} />
		);
	}

	private _getMenuItems = (release: Release): IContextualMenuItem[] => {
		if (!!this.props.onDesiredReleaseFound) {
			this.props.onDesiredReleaseFound();
		}

		const filterState: IActiveReleasesFilterState = this.props.filterState;
		return ActiveReleasesMenuButton.getMenuItems(
			{
				isDeleted: filterState.isDeleted,
				release: release,
				releaseUrl: DefinitionsUtils.getReleaseUrl(release),
				onReleaseDelete: this._onReleaseDelete,
				releasesActionSuccessCallback: this.props.releasesActionSuccessCallback,
				releasesActionErrorCallback: this.props.releasesActionErrorCallback
			});
	}

	private _getRowAriaLabel = (item: PipelineTypes.PipelineRelease): string => {
		return item.name;
	}

	private _onColumnResize = (column?: IColumn, newWidth?: number, columnIndex?: number): void => {
		if (column && column.key === ActiveReleaseColumnKeys.ActiveReleaseEnvironmentsKey) {
			this._isEnvironmentColumnResizing = true;
			this._activeReleasesActionCreator.onEnvironmentColumnResize(this.props.definitionId, newWidth);
		}
		else if (column && column.key === ActiveReleaseColumnKeys.ActiveReleaseNameKey) {
			this._isNameColumnResizing = true;
			this._activeReleasesActionCreator.onReleaseColumnResize(this.props.definitionId, newWidth);
		}
	}

	@autobind
	private _onItemInvoked(release: Release): void {
		if (this.props.onDesiredReleaseFound) {
			this.props.onDesiredReleaseFound();
		}

		if (release.status === ReleaseStatus.Draft) {
			const url = DefinitionsUtils.getOldHubReleaseUrl(release, PipelineTypes.PipelineReleaseEditorActions.environmentsEditorAction);
			DefinitionsUtils.navigateToDraftRelease(release, PipelineTypes.PipelineReleaseEditorActions.environmentsEditorAction);
		}
		else if (!this.props.filterState.isDeleted) {
			RMUtilsCore.CDReleaseProgressViewHelper.navigateToNewReleaseView(release.id);
		}
	}

	@autobind
	private _onRenderRow(props: IDetailsRowProps): JSX.Element {
		return (<div
			onMouseOver={(e) => this._onMouseOver(e, props.item.id)}
			onMouseLeave={this._onMouseLeave}
			onFocus={(e) => this._onRowFocus(e, props.item.id)}
			onBlur={this._onRowBlur} >
			<DetailsRow {...props}
				className={
					css("active-release-row", {
						"row-expanded": (this.state.expandedRows.length > 0 && this.state.expandedRows.indexOf(props.item.id) > -1),
					})
				} />
		</div>);
	}

	@autobind
	private _onRenderItemColumn(releaseItem: Release, index?: number, column?: IColumn): JSX.Element {
		const filterState: IActiveReleasesFilterState = this.props.filterState;

		switch (column.key) {
			case ActiveReleaseColumnKeys.ActiveReleaseNameKey:
				const relColumnWidth: number = this.props.releaseColumnWidth > 0 ? this.props.releaseColumnWidth : column.calculatedWidth;
				// Compute max width for artifact and branch after subtracting image and icon widths from releaseColumnWidth
				const artifactNameMaxWidth: number = this.props.releaseColumnWidth > 150 ? (this.props.releaseColumnWidth - 150) / 2 : this.props.initialArtifactNameWidth;
				const branchMaxWidth: number = this.props.releaseColumnWidth > 150 ? (this.props.releaseColumnWidth - 150) / 2 : this.props.initialBranchNameWidth;
				return (<ActiveReleaseNameColumn
					release={releaseItem}
					releaseClass={"active-releases-name-column"}
					columnWidth={relColumnWidth}
					artifactNameMaxWidth={artifactNameMaxWidth}
					branchNameMaxWidth={branchMaxWidth}
					focusedRowReleaseId={this.state.focusedRowReleaseId}
					hoveredRowReleaseId={this.state.hoveredRowReleaseId}
					initiallyExpanded={this._isExpanded(releaseItem.id)}
					onToggleExpansion={this._toggleExpansion}
					isDeleted={filterState.isDeleted}
					onDesiredReleaseFound={this.props.onDesiredReleaseFound}
				/>);

			case ActiveReleaseColumnKeys.ActiveReleaseEnvironmentsKey:
				let columnWidth: number;
				if (this.state.expandedRows && this.state.expandedRows.length > 0) {
					// On release expand
					let currentEnvColWidth: number;
					if (this.props.envColumnWidth > 0) {
						currentEnvColWidth = this.props.envColumnWidth;
					}
					else {
						currentEnvColWidth = this.props.initialEnvColumnWidth;
					}
					columnWidth = Math.max(this.props.maxEnvCanvasWidth, currentEnvColWidth);
				}
				else if (this.props.envColumnWidth > 0) {
					// On release expand
					// On Env chain expand;
					// On resize
					// Also when RD in left panel changes, take the previously set width from props
					columnWidth = this.props.envColumnWidth;
				}
				else {
					columnWidth = column.calculatedWidth;
				}

				return (<ActiveReleaseEnvironmentsColumn
					release={releaseItem}
					definitionId={this.props.definitionId}
					isExpanded={this._isExpanded(releaseItem.id)}
					definitionEnvironmentCurrentReleaseMap={this.props.definitionEnvironmentCurrentReleaseMap}
					instanceId={Utils_String.format(this._instanceIdFormat, releaseItem.id)}
					envTileSize={this.props.envTileSize}
					visibleEnvCount={this._getVisibleEnvCount(columnWidth, releaseItem)}
					onDesiredReleaseFound={this.props.onDesiredReleaseFound}
				/>);

			case ActiveReleaseColumnKeys.ActiveReleaseCreatedKey:
				return this._getReleaseCreatedColumn(releaseItem);

			case ActiveReleaseColumnKeys.ActiveReleaseDescriptionKey:
				return this._getReleaseDescriptionColumn(releaseItem);
		}
	}

	@autobind
	private _toggleExpansion(releaseId: number, isExpanded: boolean): void {
		let expandedRows = this.state.expandedRows;
		let newRows;

		if (isExpanded) {
			expandedRows.push(releaseId);
		} else {
			let itemIndex = expandedRows.indexOf(releaseId);
			if (itemIndex > -1) {
				expandedRows.splice(itemIndex, 1);
			}
		}

		this.setState({
			expandedRows: expandedRows
		});

		const release = Utils_Array.first(this.props.releases, (rel) => rel.id === releaseId);
		this._activeReleasesActionCreator.onReleaseExpand(this.props.definitionId, this._computeEnvCanvasWidth(release.environments));
	}


	@autobind
	private _onReleaseDelete(release: Release): void {
		const message = Utils_String.localeFormat(Resources.DeleteReleaseConfirmationMessageFormat, release.name);
		renderDeleteReleaseDialog(
			release,
			() => {
				this._activeReleasesActionCreator.removeRelease(release.id, message);
				if (this.props.releasesActionSuccessCallback) {
					this.props.releasesActionSuccessCallback(message);
				}
			});
	}

	private _getReleaseCreatedColumn(release: PipelineTypes.PipelineRelease): JSX.Element {
		const createdDateTimeText: string = release.createdOn ? this._getDateTimeText(release.createdOn) : Utils_String.empty;

		return (
			<div className="active-release-created-details flex-column">
				<TooltipHost content={createdDateTimeText} directionalHint={DirectionalHint.bottomCenter} hostClassName="active-release-created-date">
					{createdDateTimeText}
				</TooltipHost>
			</div>
		);
	}

	private _getDateTimeText(date: Date): string {
		const formattedDate = localeFormat(date, "yyyy-MM-dd");
		const formattedTime = localeFormat(date, "HH:mm");
		return (Utils_String.localeFormat("{0} {1}", formattedDate, formattedTime));
	}

	private _getTriggeTypeText(releaseReason: ReleaseReason): string {
		let triggerText: string;
		switch (releaseReason) {
			case ReleaseReason.ContinuousIntegration:
				triggerText = Resources.ContinuousIntegrationTriggerHeaderText;
				break;
			case ReleaseReason.PullRequest:
				triggerText = Resources.PullRequestTriggerHeaderText;
				break;
			case ReleaseReason.Schedule:
				triggerText = Resources.ScheduledTriggerHeaderText;
				break;
			default:
				triggerText = Resources.ManualTriggerHeaderText;
				break;
		}
		return triggerText;
	}

	private _getReleaseDescriptionColumn(release: PipelineTypes.PipelineRelease): JSX.Element {
		const releaseDescription: string = release.description;
		return (
			<div className="active-release-tags-description-container">
				{
					releaseDescription && (
						<div className="active-rel-description-container">
							<TooltipHost hostClassName={"active-rel-description-tooltip overflow-text-container"} content={releaseDescription} directionalHint={DirectionalHint.bottomCenter} overflowMode={TooltipOverflowMode.Self}>
								<span className="active-rel-description"> {releaseDescription} </span>
							</TooltipHost>
						</div>
					)
				}
			</div>
		);
	}

	private _getColumns(): IColumn[] {
		let columns: IColumn[] = [];
		let minEnvColumnWidth: number = this.props.initialEnvColumnWidth;
		let maxEnvColumnWidth: number = this.props.initialEnvColumnWidth;
		if (this.state.expandedRows && this.state.expandedRows.length > 0) {
			// On Release expand, we want to show full environment canvas, so alter both min and max width in order to fix column width
			let currentEnvColWidth: number;
			if (this.props.envColumnWidth > 0) {
				currentEnvColWidth = this.props.envColumnWidth;
			}
			else {
				currentEnvColWidth = this.props.initialEnvColumnWidth;
			}
			minEnvColumnWidth = maxEnvColumnWidth = Math.max(this.props.maxEnvCanvasWidth, currentEnvColWidth);
		}
		else if (this.props.envColumnWidth > 0) {
			// On resize, the action raised sets the envColWidth in ActiveReleasesStore; Whenever RD in left panel is changed use the value previously set on resize 
			maxEnvColumnWidth = this.props.envColumnWidth;
			if (!this._isEnvironmentColumnResizing) {
				// Do not fix width if column is currently resizing 
				minEnvColumnWidth = this.props.envColumnWidth;
			}
		}

		//Setting minWidth for Name column based on release class to handle spacing between name and env columns
		const minReleaseNameColumnWidth = this.props.releaseColumnWidth > 0 ? this.props.releaseColumnWidth : this.props.initialNameColumnWidth;

		columns.push({
			key: ActiveReleaseColumnKeys.ActiveReleaseNameKey,
			name: Resources.ReleasesText,
			fieldName: ActiveReleaseColumnKeys.ActiveReleaseNameKey,
			minWidth: !this._isNameColumnResizing ? minReleaseNameColumnWidth : 100, // Do not set a min based on props to allow resizing
			isResizable: true,
			maxWidth: this.props.releaseColumnWidth > 0 ? this.props.releaseColumnWidth : minReleaseNameColumnWidth,
			headerClassName: "active-releases-details-list-header"
		});

		columns.push({
			key: ActiveReleaseColumnKeys.ActiveReleaseEnvironmentsKey,
			name: Resources.ActiveReleaseEnvironmentsHeaderText,
			fieldName: ActiveReleaseColumnKeys.ActiveReleaseEnvironmentsKey,
			minWidth: !this._isEnvironmentColumnResizing ? minEnvColumnWidth : 150, // Do not set a min based on props to allow resizing
			isResizable: true,
			maxWidth: maxEnvColumnWidth,
			headerClassName: "active-releases-details-list-header",
			className: "active-release-environments-column"
		});

		columns.push({
			key: ActiveReleaseColumnKeys.ActiveReleaseCreatedKey,
			name: Resources.ActiveReleaseCreatedHeaderText,
			fieldName: ActiveReleaseColumnKeys.ActiveReleaseCreatedKey,
			minWidth: 150,
			isResizable: false,
			maxWidth: 150,
			headerClassName: "active-releases-details-list-header"
		});

		columns.push({
			key: ActiveReleaseColumnKeys.ActiveReleaseDescriptionKey,
			name: Resources.ActiveReleaseDescriptionHeaderText,
			fieldName: ActiveReleaseColumnKeys.ActiveReleaseDescriptionKey,
			minWidth: 400,
			maxWidth: 400,
			isResizable: false,
			headerClassName: "active-releases-details-list-header"
		});

		return columns;
	}

	private _isExpanded(releaseId: number): boolean {
		const expandedRows = this.state.expandedRows;
		if (!expandedRows || expandedRows.length <= 0) {
			return false;
		}
		else {
			return expandedRows.some((rowId) => rowId === releaseId);
		}
	}

	private _getVisibleEnvCount(columnWidth: number, releaseItem: PipelineTypes.PipelineRelease): number {
		const actualEnvCount: number = releaseItem.environments.length;

		if (this.props.envTileSize === ReleaseEnvironmentTileSize.Large) {
			return actualEnvCount;
		}
		else {
			return Math.floor((columnWidth - 20) / (ReleasesViewCanvasConstants.EnvironmentNodeWidthSmall + 10)); // -20 to account for show more button; +10 to account for tile margin
		}
	}

	private _computeEnvCanvasWidth(environments: PipelineTypes.PipelineEnvironment[]) {
		let environmentNameToDependentsMap: IDictionaryStringTo<number> = {};
		for (const env of environments) {
			this._computeEnvDependentsLength(env.name, environmentNameToDependentsMap, environments);
		}

		let maxDependentEnvironmentsLength: number = 1;
		// The max value in the dictionary is the length of longest possible env chain in canvas
		for (const key in environmentNameToDependentsMap) {
			if (maxDependentEnvironmentsLength < environmentNameToDependentsMap[key]) {
				maxDependentEnvironmentsLength = environmentNameToDependentsMap[key];
			}
		}

		if (this.props.envTileSize === ReleaseEnvironmentTileSize.Large) {
			return maxDependentEnvironmentsLength * (ReleasesViewCanvasConstants.EnvironmentNodeWidthLarge + CreateReleaseEnvironmentNodeConstants.createReleaseEnvironmentCanvasHorizontalMarginSmall); // +30 for separator length
		}
		else {
			return maxDependentEnvironmentsLength * (ReleasesViewCanvasConstants.EnvironmentNodeWidthSmall + CreateReleaseEnvironmentNodeConstants.createReleaseEnvironmentCanvasHorizontalMarginSmall); // +30 for separator length
		}
	}

	/*Recursively calculate the length of dependent environment triggers for currentEnvName*/
	private _computeEnvDependentsLength(currentEnvName: string, envNameToLengthMap: IDictionaryStringTo<number>, environments: PipelineTypes.PipelineEnvironment[]): void {
		if (envNameToLengthMap.hasOwnProperty(currentEnvName)) {
			return;
		}

		const env: PipelineTypes.PipelineEnvironment = Utils_Array.first(environments, (env) => Utils_String.equals(env.name, currentEnvName));

		if (!env.conditions || env.conditions.length === 0) {
			envNameToLengthMap[currentEnvName] = 1;
			return;
		}

		for (const condition of env.conditions) {
			if (condition.conditionType !== PipelineTypes.PipelineEnvironmentTriggerConditionType.EnvironmentState) {
				envNameToLengthMap[currentEnvName] = 1;
				return;
			}

			envNameToLengthMap[currentEnvName] = 0;
			this._computeEnvDependentsLength(condition.name, envNameToLengthMap, environments);
			// Setting max of dependents' length as currentEnv length
			if (envNameToLengthMap[currentEnvName] < envNameToLengthMap[condition.name]) {
				envNameToLengthMap[currentEnvName] = envNameToLengthMap[condition.name];
			}
		}
		envNameToLengthMap[currentEnvName] += 1; // +1 for the currentEnv itself
	}

	private _onRowFocus = (event: any, activeRowReleaseId: number): void => {
		this.setState({
			focusedRowReleaseId: activeRowReleaseId
		});
	}

	private _onRowBlur = (): void => {
		this.setState({
			focusedRowReleaseId: -1
		});
	}

	private _onMouseOver = (event: any, activeRowReleaseId: number): void => {
		this.setState({
			hoveredRowReleaseId: activeRowReleaseId
		});
	}

	private _onMouseLeave = (): void => {
		this.setState({
			hoveredRowReleaseId: -1
		});
	}

	private _instanceIdFormat = "Active-Release-{0}";
	private _activeReleasesActionCreator: ActiveReleasesActionCreator;
	private _isEnvironmentColumnResizing: boolean = false;
	private _isNameColumnResizing: boolean = false;
	private _activeReleasesDetailsList: VssDetailsList;
}