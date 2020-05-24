/// <reference types="react" />

import * as React from "react";

import { FeatureFlag_CDProcessParameters } from "DistributedTaskControls/Common/Common";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { Item, ItemOverviewAriaProps, ItemOverviewProps, ItemOverviewState } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ProcessParameter } from "DistributedTaskControls/Components/ProcessParameter";

import { EnvironmentName } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentName";
import { EnvironmentNameStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentNameStore";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { ProcessItemOverview as ProcessItemOverviewComponent } from "PipelineWorkflow/Scripts/Shared/Process/ProcessItemOverview";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export interface IProcessItemOverviewProps extends ItemOverviewProps {
    storeInstanceId: string;
}

export class ProcessItemOverview extends ComponentBase.Component<IProcessItemOverviewProps, ItemOverviewState> {

    public componentWillMount(): void {
        this._environmentNameStore = StoreManager.GetStore<EnvironmentNameStore>(EnvironmentNameStore, this.props.storeInstanceId);
        this._deployEnvironmentStore = StoreManager.GetStore<DeployEnvironmentStore>(DeployEnvironmentStore, this.props.storeInstanceId);
        this.setState({
            isValid: this._isEnvironmentNameValid()
        });

        this._environmentNameStore.addChangedListener(this._onChange);
    }


    public componentWillUnmount(): void {
        this._environmentNameStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        return (<ProcessItemOverviewComponent
            instanceId={this.props.instanceId}
            item={this.props.item}
            storeInstanceId={this.props.storeInstanceId}
            isEnvironmentNameValid={this._isEnvironmentNameValid}
            environmentName={this._environmentNameStore.getState().environmentName}
            artifactPickerStore={this._deployEnvironmentStore}
            ariaProps={this.props.ariaProps} />);
    }

    private _onChange = () => {
        this.setState({
            isValid: this._isEnvironmentNameValid(),
        });
    }

    private _isEnvironmentNameValid = (): boolean => {
        return this._environmentNameStore.isValid();
    }

    private _environmentNameStore: EnvironmentNameStore;
    private _deployEnvironmentStore: DeployEnvironmentStore;
}

export class ProcessItem implements Item {

    constructor(storeInstanceId: string, private _treeLevel?: number, private _initialIndex?: number) {
        this._store = StoreManager.GetStore<DeployEnvironmentStore>(DeployEnvironmentStore, storeInstanceId);
    }

    public getOverview(viewInstanceId?: string): JSX.Element {
        if (!this._overView) {
            this._overView = <ProcessItemOverview
                item={this}
                instanceId={viewInstanceId}
                storeInstanceId={this._store.getInstanceId()}
                ariaProps={{
                    level: this._treeLevel,
                    expanded: true,
                    setSize: this._initialIndex + 1,
                    positionInSet: this._initialIndex + 1,
                    role: "treeitem"
                } as ItemOverviewAriaProps} />;
        }

        return this._overView;
    }

    public getDetails(viewInstanceId?: string): JSX.Element {
        if (!this._details) {

            let linkUnlinkNotSupported = !(FeatureAvailabilityService.isFeatureEnabled(FeatureFlag_CDProcessParameters, false));

            this._details = (
                <div className="constrained-width">
                    <EnvironmentName instanceId={this._store.getInstanceId()} />
                    <ProcessParameter
                        instanceId={this._store.getInstanceId()}
                        linkUnlinkNotSupported={linkUnlinkNotSupported} />
                </div>);
        }

        return this._details;
    }

    public getKey(): string {
        return "cd.processitem-" + this._store.getInstanceId();
    }

    public getStore(): DeployEnvironmentStore {
        return this._store;
    }

    private _overView: JSX.Element;
    private _details: JSX.Element;
    private _store: DeployEnvironmentStore;
}