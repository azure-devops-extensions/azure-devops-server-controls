/// <reference types="react" />

import * as React from "react";

import { registerLWPComponent } from "VSS/LWP";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { EnvironmentsCanvas, IEnvironmentsCanvasState, IEnvironmentsCanvasProps } from "PipelineWorkflow/Scripts/SharedComponents/EnvironmentsCanvas/EnvironmentsCanvas";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Shared/EnvironmentList/EnvironmentListStore";
import { IActiveReleaseEnvironmentNodeProps, ActiveReleaseEnvironmentNode } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseEnvironmentNode";
import { ActiveReleaseEnvironmentNodeHelper, ReleaseEnvironmentTileSize } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseEnvironmentNodeHelper";

import { ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { EnvironmentListActionCreator } from "PipelineWorkflow/Scripts/Shared/EnvironmentList/EnvironmentListActionCreator";

export interface IActiveReleaseEnvironmentsCanvasProps extends IEnvironmentsCanvasProps {
    setRowWidthDelegate: () => void;
    releaseId: number;
    definitionEnvironmentCurrentReleaseMap: IDictionaryNumberTo<number>;
    envTileSize?: ReleaseEnvironmentTileSize;
    onReleaseFound?: () => void;
}

export interface IActiveReleaseEnvironmentsCanvasState<T extends ReleaseEnvironment> extends IEnvironmentsCanvasState<ReleaseEnvironment> {
}

export class ActiveReleaseEnvironmentsCanvas<T extends ReleaseEnvironment> extends EnvironmentsCanvas<ReleaseEnvironment, IActiveReleaseEnvironmentsCanvasProps, IActiveReleaseEnvironmentsCanvasState<ReleaseEnvironment>> {

    public render(): JSX.Element {
        return (
            <div className="active-release-environments-canvas-container">
                <div className="active-release-environments-canvas-content">
                    {
                        super.render()
                    }
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        super.componentDidMount();

        if (this.props.setRowWidthDelegate) {
            this.props.setRowWidthDelegate();
        }
    }

    protected getNodeElement = (key: string, releaseEnvironment: ReleaseEnvironment): JSX.Element => {
        let nodeProps: IActiveReleaseEnvironmentNodeProps = ActiveReleaseEnvironmentNodeHelper.getNodeProps(releaseEnvironment, this.props.definitionEnvironmentCurrentReleaseMap, this.props.onReleaseFound);
        return <ActiveReleaseEnvironmentNode envTileSize={this.props.envTileSize} {...nodeProps} />;
    }

    protected getNodeHeightHint = (environmentInstanceId: string): number => {
        return 0;
    }
}

class ActiveReleaseEnvironmentsCanvasProxy extends React.Component<IActiveReleaseEnvironmentsCanvasProps & { environments?: ReleaseEnvironment[] }, {}>{
    constructor(props: IActiveReleaseEnvironmentsCanvasProps) {
        super(props);
        StoreManager.GetStore<EnvironmentListStore<ReleaseEnvironment>>(EnvironmentListStore, this.props.instanceId);

        if (this.props.environments) {
            ActionCreatorManager.GetActionCreator<EnvironmentListActionCreator<ReleaseEnvironment>>(EnvironmentListActionCreator, this.props.instanceId)
                .initializeEnvironmentList(this.props.environments);
        }
    }

    public render(): React.ReactNode {
        return <ActiveReleaseEnvironmentsCanvas {...this.props} />;
    }
}

registerLWPComponent("release-row-canvas", ActiveReleaseEnvironmentsCanvasProxy);