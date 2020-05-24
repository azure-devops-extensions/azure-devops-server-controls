
/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { PanelComponent } from "DistributedTaskControls/Components/PanelComponent";

import { EnvironmentDeployPanelTabs } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentDeployPanelTabs";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployEnvironmentPanel";

export interface IDeployEnvironmentPanelProps extends ComponentBase.IProps {
    hasCloseButton?: boolean;
    onClose?: () => void;
    elementToFocusOnDismiss?: HTMLElement;
    instanceId: string;
}

export interface IDeployEnvironmentPanelState {
    showPanel: boolean;
}

export class DeployEnvironmentPanel extends ComponentBase.Component<IDeployEnvironmentPanelProps, IDeployEnvironmentPanelState> {
    
    static openDeployPanel(environmentId: string, elementToFocusOnDismiss?: HTMLElement, onClosed?: () => void): void {

        let container = document.createElement("div");
        document.body.appendChild(container);

        let onClose = () => {
            ReactDOM.unmountComponentAtNode(container);
            container.remove();
            onClosed();
        };

        let component = React.createElement(
            DeployEnvironmentPanel,
            {
                hasCloseButton: true,
                onClose: onClose,
                instanceId: environmentId,
                elementToFocusOnDismiss: elementToFocusOnDismiss
            });
        ReactDOM.render(component, container);
    }

    constructor(props: IDeployEnvironmentPanelProps) {
        super(props);
        this.state = {
            showPanel: true
        };
    }

    public render(): JSX.Element {
        return (
            <PanelComponent
                showPanel={this.state.showPanel}
                panelWidth={DeployEnvironmentPanel._width}
                onClose={this._closePanel}
                onClosed={this._handleOnClosed}
                isBlocking={true}
                hasCloseButton={this.props.hasCloseButton}
                cssClass={"deploy-environment-panel"}
                elementToFocusOnDismiss={this.props.elementToFocusOnDismiss}>
                <div className="environment-deploy-panel-tabs-container">
                    <EnvironmentDeployPanelTabs 
                        key={this.getKey()}
                        instanceId={this.props.instanceId}
                        onActionComplete={this._closePanel}/>
                </div>
            </PanelComponent>);
    }

    

    public getKey(): string {
        return "cd-release-environment-deploy-action";
    }


    private _closePanel = () => {
        if (this.state && this.state.showPanel) {
            this.setState({ showPanel: false });
        }
    }

    private _handleOnClosed = () => {
        if (this.props.onClose) {
            this.props.onClose();
        }
    }

    private static readonly _width: number = 670;
}
