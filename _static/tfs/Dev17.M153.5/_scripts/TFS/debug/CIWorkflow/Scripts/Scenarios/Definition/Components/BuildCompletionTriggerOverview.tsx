/// <reference types="react" />

import * as React from "react";

import { IBuildCompletionTriggerState, BuildCompletionTriggerStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildCompletionTriggerStore";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Item } from "DistributedTaskControls/Common/Item";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";

import { BuildCompletionTrigger } from "TFS/Build/Contracts";

export interface IBuildCompletionTriggerOverviewProps extends Base.IProps {
    index: number;
    item: Item;
    trigger: BuildCompletionTrigger;
}

export class BuildCompletionTriggerOverview extends Base.Component<IBuildCompletionTriggerOverviewProps, IBuildCompletionTriggerState> {
    public constructor(props: IBuildCompletionTriggerOverviewProps) {
        super(props);

        this._store = StoreManager.GetStore<BuildCompletionTriggerStore>(BuildCompletionTriggerStore);

        this.state = this._store.getState();
    }

    public render(): JSX.Element {
        let viewElement = null;

        if (this.props.index >= this.state.buildCompletionTriggers.length) {
            // This trigger no longer exists, nothing to render
            return null;
        }

        if (!this.state.buildCompletionTriggers[this.props.index].isValid) {
            viewElement = (<ErrorComponent cssClass="trigger-overview-error" errorMessage={Resources.SomeSettingsNeedAttention} />);
        }
        else {
            viewElement = (<div> {Resources.BuildCompletionEnabled} </div>);
        }

        let triggerTitle: string = Resources.SettingUpTrigger;
        if (this.props.trigger && this.props.trigger.definition && this.props.trigger.definition.id) {
            triggerTitle = this.state.buildCompletionTriggers[this.props.index].title;
        }

        return (
            <div className="repository-trigger-item-overview">
                <TwoPanelOverviewComponent
                    title={triggerTitle}
                    view={viewElement}
                    item={this.props.item}
                    instanceId="trigger-selector"
                    iconClassName="ms-Icon ms-Icon--Build trigger-icon"
                    overviewClassName="si-trigger-overview-body" />
            </div>
        );
    }

    public componentDidMount() {
        this._store.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChange);
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _store: BuildCompletionTriggerStore;
}
