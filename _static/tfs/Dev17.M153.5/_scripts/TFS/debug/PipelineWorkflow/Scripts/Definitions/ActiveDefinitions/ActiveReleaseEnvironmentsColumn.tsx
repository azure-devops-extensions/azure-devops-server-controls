import * as React from "react";

// DTC
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component, IProps, IStateless } from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
// ReleasePipeline
import { Release, ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

// PipelineWorkflow
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Shared/EnvironmentList/EnvironmentListStore";
import { CreateReleaseEnvironmentNodeConstants } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/Constants";
import { EnvironmentListActionCreator } from "PipelineWorkflow/Scripts/Shared/EnvironmentList/EnvironmentListActionCreator";
import { ActiveReleaseEnvironmentsChain } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseEnvironmentsChain";
import { ActiveReleaseEnvironmentsCanvas } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseEnvironmentsCanvas";
import { ReleaseEnvironmentTileSize } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseEnvironmentNodeHelper";
import { ReleasesViewCanvasConstants } from "PipelineWorkflow/Scripts/Definitions/Constants";

import { registerLWPComponent } from "VSS/LWP";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseColumn";

export interface IActiveReleaseColumnProps extends IProps {
	release: Release;
	definitionId: number;
	isExpanded: boolean;
	definitionEnvironmentCurrentReleaseMap: IDictionaryNumberTo<number>;
	envTileSize: ReleaseEnvironmentTileSize;
	visibleEnvCount: number;
	onDesiredReleaseFound?: () => void;
}

export class ActiveReleaseEnvironmentsColumn extends Component<IActiveReleaseColumnProps, IStateless> {
	public constructor(props: IActiveReleaseColumnProps) {
		super(props);

		this._environmentListActionCreator = ActionCreatorManager.GetActionCreator<EnvironmentListActionCreator<ReleaseEnvironment>>(EnvironmentListActionCreator, this.props.instanceId);
		this._environmentListStore = StoreManager.GetStore<EnvironmentListStore<ReleaseEnvironment>>(EnvironmentListStore, this.props.instanceId);
	}

	public componentWillMount(): void {
		setTimeout(() => {
			this._environmentListActionCreator.initializeEnvironmentList(this.props.release.environments);
		}, 0);
	}

	public render(): JSX.Element {
		let release = this.props.release as Release;
		let expanded: boolean = this.props.isExpanded;

		const content: JSX.Element = this.props.isExpanded ? this._getReleaseEnvironmentsCanvas() : this._getReleaseEnvironmentsChain();
		return content;
	}

	private _getReleaseEnvironmentsCanvas(): JSX.Element {

		let nodeWidth = ReleasesViewCanvasConstants.EnvironmentNodeWidthLarge;
		if (this.props.envTileSize === ReleaseEnvironmentTileSize.Small) {
			nodeWidth = ReleasesViewCanvasConstants.EnvironmentNodeWidthSmall;
		}

		return <ActiveReleaseEnvironmentsCanvas
			nodeHeight={ReleasesViewCanvasConstants.EnvironmentNodeHeight}
			nodeWidth={nodeWidth}
			gridCellHeight={CreateReleaseEnvironmentNodeConstants.gridCellHeight}
			gridCellWidth={CreateReleaseEnvironmentNodeConstants.gridCellWidth}
			verticalMargin={CreateReleaseEnvironmentNodeConstants.createReleaseEnvironmentCanvasVerticalMarginSmall}
			horizontalMargin={CreateReleaseEnvironmentNodeConstants.createReleaseEnvironmentCanvasHorizontalMarginSmall}
			instanceId={this._environmentListStore.getInstanceId()}
			cssClass={"active-release-environment-canvas"}
			ariaLabel={Resources.CreateReleaseEnvironmentCanvasAriaLabel}
			leftMargin={CreateReleaseEnvironmentNodeConstants.createReleaseEnvironmentCanvasLeftMargin}
			releaseId={this.props.release.id}
			envTileSize={this.props.envTileSize}
			definitionEnvironmentCurrentReleaseMap={this.props.definitionEnvironmentCurrentReleaseMap}
			setRowWidthDelegate={() => { }}
			onReleaseFound={this.props.onDesiredReleaseFound}>
		</ActiveReleaseEnvironmentsCanvas>;
	}

	private _getReleaseEnvironmentsChain(): JSX.Element {
		let release: Release = this.props.release;

		return <ActiveReleaseEnvironmentsChain
			definitionId={this.props.definitionId}
			environments={release.environments}
			cssClass="active-rel-env-cell"
			definitionEnvironmentCurrentReleaseMap={this.props.definitionEnvironmentCurrentReleaseMap}
			envTileSize={this.props.envTileSize}
			visibleEnvCount={this.props.visibleEnvCount}
			releaseId={release.id}
			onReleaseFound={this.props.onDesiredReleaseFound} />;
	}

	private _environmentListActionCreator: EnvironmentListActionCreator<ReleaseEnvironment>;
	private _environmentListStore: EnvironmentListStore<ReleaseEnvironment>;
}

registerLWPComponent("activeReleaseEnvironmentsColumn", ActiveReleaseEnvironmentsColumn);