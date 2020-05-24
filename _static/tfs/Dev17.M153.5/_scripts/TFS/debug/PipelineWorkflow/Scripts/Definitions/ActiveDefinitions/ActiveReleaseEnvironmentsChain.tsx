import * as React from "react";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { Component, IProps, IStateless } from "DistributedTaskControls/Common/Components/Base";
import { PipelineEnvironment, PipelineReleaseApproval } from "PipelineWorkflow/Scripts/Common/Types";
import { ActiveReleasesActionCreator } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesActionCreator";
import { ActiveReleaseEnvironmentNodeHelper, ReleaseEnvironmentTileSize } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseEnvironmentNodeHelper";
import { ActiveReleaseEnvironmentNode, IActiveReleaseEnvironmentNodeProps } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseEnvironmentNode";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleasesViewCanvasConstants } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { EnvironmentStatus, ApprovalStatus } from "ReleaseManagement/Core/Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import LWP = require("VSS/LWP");

export interface IActiveReleaseEnvironmentsCellProps extends IProps {
    releaseId: number;
    definitionId: number;
    environments: PipelineEnvironment[];
    definitionEnvironmentCurrentReleaseMap: IDictionaryNumberTo<number>;
    envTileSize?: ReleaseEnvironmentTileSize;
    visibleEnvCount?: number;
    onReleaseFound?: () => void;
    releaseEnvironmentNodeCss?: string;
}

export class ActiveReleaseEnvironmentsChain extends Component<IActiveReleaseEnvironmentsCellProps, IStateless> {

    public constructor(props: IActiveReleaseEnvironmentsCellProps) {
        super(props);

        this._activeReleasesActionCreator = ActionCreatorManager.GetActionCreator<ActiveReleasesActionCreator>(ActiveReleasesActionCreator);
    }

    public render(): JSX.Element {
        const hiddenEnvCount = this.props.environments.length - this.props.visibleEnvCount;
        if (hiddenEnvCount > 0) {
            return this._getEnvironmentsChainWithShowMoreButton();
        }
        else {
            return this._getAllEnvironmentsChain();
        }
    }

    private _getAllEnvironmentsChain(): JSX.Element {
        const nodes = this._getNodes(this.props.environments);
        return (
            <div className={this.props.cssClass}> {nodes} </div>
        );
    }

    private _getEnvironmentsChainWithShowMoreButton(): JSX.Element {
        const visibleEnvironments = this.props.environments.slice(0, this.props.visibleEnvCount);
        const visibleNodes = this._getNodes(visibleEnvironments);
        return (
            <div className={this.props.cssClass}>
                {visibleNodes}
                {this._getShowMoreEnvironmentsButton()}
            </div>
        );
    }

    private _getNodes(environments: PipelineEnvironment[]): JSX.Element[] {
        let nodes = environments.map((env) => {
            let nodeProps: IActiveReleaseEnvironmentNodeProps = ActiveReleaseEnvironmentNodeHelper.getNodeProps(env, this.props.definitionEnvironmentCurrentReleaseMap, this.props.onReleaseFound);
            return (
                <ActiveReleaseEnvironmentNode
                    key={nodeProps.environment.id}
                    envTileSize={this.props.envTileSize}
                    {...nodeProps} 
                    cssClass={this.props.releaseEnvironmentNodeCss}
                    />);
        });

        return nodes;
    }

    private _getShowMoreEnvironmentsButton(): JSX.Element {
        const hiddenEnvCount = this.props.environments.length - this.props.visibleEnvCount;
        return (<div onClick={this._expandEnvironments} data-is-focusable={true} tabIndex={0} onKeyDown={this._onShowMoreButtonKeyPress} className={"active-release-show-more-button"}>
            <VssIcon iconType={VssIconType.fabric} iconName="Add" className="active-release-show-more-icon" />
            <span>{Utils_String.localeFormat(Resources.ActiveReleaseHiddenEnvironmentCount, hiddenEnvCount)}</span>
        </div>);
    }

    private _expandEnvironments = (): void => {
        this._activeReleasesActionCreator.onEnvironmentColumnResize(this.props.definitionId, this._getChainWidthOnExpand());
    }

    private _onShowMoreButtonKeyPress = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
            this._expandEnvironments();
        }
    }

    private _getChainWidthOnExpand(): number {
        const envCount: number = this.props.environments.length;
        const nodeWidth: number = this.props.envTileSize === ReleaseEnvironmentTileSize.Large ? ReleasesViewCanvasConstants.EnvironmentNodeWidthLarge : ReleasesViewCanvasConstants.EnvironmentNodeWidthSmall;
        return envCount * (nodeWidth + 10) + 20; // +10 to account for margin; +20 for show more button which was subtracted in collapsed state
    }

    private _activeReleasesActionCreator: ActiveReleasesActionCreator;
}

LWP.registerLWPComponent("activeReleaseEnvironmentsChain", ActiveReleaseEnvironmentsChain);