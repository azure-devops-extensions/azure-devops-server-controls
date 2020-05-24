import * as React from "react";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import { ServiceEndpointPolicyActionCreator } from "Admin/Scripts/ServiceEndpoint/Actions/ServiceEndpointPolicyActions";
import { ServiceEndpointPolicyStore, IServiceEndpointPolicyState } from "Admin/Scripts/ServiceEndpoint/Stores/ServiceEndpointPolicyStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { LoadableComponent } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponent";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { Fabric } from "OfficeFabric/Fabric";
import { Label } from "OfficeFabric/Label";
import { autobind } from "OfficeFabric/Utilities";
import { PrimaryButton } from "OfficeFabric/Button";

import { Component, Props } from "VSS/Flux/Component";
import * as Utils_HTML from "VSS/Utils/Html";

export interface IServiceEndpointPolicyViewProps extends Props {
    endpointName: string;
    endpointId: string;
    instanceId: string;
}

export class ServiceEndpointPolicyView extends Component<IServiceEndpointPolicyViewProps, IServiceEndpointPolicyState> {
    constructor(props?: IServiceEndpointPolicyViewProps) {
        super(props);

        this._store = StoreManager.GetStore<ServiceEndpointPolicyStore>(ServiceEndpointPolicyStore, this.props.instanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator<ServiceEndpointPolicyActionCreator>(ServiceEndpointPolicyActionCreator, this.props.instanceId);
        this.state = this._store.getState();
    }

    public render(): JSX.Element {
        return (
            <Fabric>
                <LoadableComponent
                    instanceId={this.props.instanceId}
                    label={AdminResources.LoadingInProgress} >
                    <div role="heading" className="pipeline-policies-section" aria-level={2}>
                        {this.getEndpointPolicyView()}
                        <div>
                            {this._getErrorComponent()}
                        </div>
                    </div>
                </LoadableComponent>
            </Fabric>
        );
    }

    public componentWillMount(): void {
        this._store.addChangedListener(this.onStoreChange);
        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this.onStoreChange);

        StoreManager.DeleteStore<ServiceEndpointPolicyStore>(ServiceEndpointPolicyStore, this.props.instanceId);
    }

    private getEndpointPolicyView(): JSX.Element {
        if (!this.state.loadingError) {
            return (<div>
                <Label className="pipeline-policies-header">
                    {AdminResources.ServiceEndpointPipelinePolicyHeader}
                </Label>
                <BooleanInputComponent
                    cssClass="all-pipeline-access"
                    label={AdminResources.AllowPipelineAccess}
                    value={this.state.isAccessOnAllPipelines}
                    onValueChanged={this._allPipelinePolicyCheckChanged} />
                <div className="action-button-section">
                    <PrimaryButton
                        disabled={this._store.isSaveDisabled()}
                        className="save-changes-action-button"
                        onClick={this._saveChanges}
                        text={AdminResources.SaveChangesButtonText}
                        ariaLabel={AdminResources.SaveChangesButtonText} />
                </div>
            </div>);
        }
        else
            return null;
    }

    @autobind
    private _saveChanges() {
        //  Get the current state of allowPipelineCheckbox and make an authorize call for the endpoint.
        this._actionCreator.authorizeServiceEndpoint(this.props.endpointId, this.props.endpointName, this.state.isAccessOnAllPipelines);
    }

    @autobind
    private _allPipelinePolicyCheckChanged(value: boolean) {
        // Raise action for change in policy value
        this._actionCreator.togglePolicyForAllPipelinesCheck(value);
    }

    private onStoreChange = (): void => {
        this.setState(this._store.getState());
    }

    private _renderHtml(html: string) {
        return {
            __html: html
        };
    }

    private _getErrorComponent(): JSX.Element {
        if (this.state.loadingError || this.state.error) {

            return (<div className="endpoint-policy-error">
                <MessageBar messageBarType={MessageBarType.error} isMultiline={false} truncated={true} >
                    <span dangerouslySetInnerHTML={this._renderHtml(Utils_HTML.HtmlNormalizer.normalize(this.state.loadingError || this.state.error))} />
                </MessageBar>
            </div>);

        }
        else {
            return null;
        }
    }

    private _store: ServiceEndpointPolicyStore;
    private _actionCreator: ServiceEndpointPolicyActionCreator;
}