/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as ContainerTabBase from "DistributedTaskControls/SharedViews/ContainerTabs/ContainerTabBase";

import { Item } from "DistributedTaskControls/Common/Item";
import { GeneralOptionsItem } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/GeneralOptionsItem";
import { IntegrationsOptionsItem } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/IntegrationsOptionsItem";
import { OptionsTabSharedView } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/OptionsTabSharedView";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/OptionsTab";


export interface IOptionsTabBaseProps extends ContainerTabBase.IContainerTabBaseProps {
}
export interface IOptionsTabBaseState extends ContainerTabBase.IContainerTabBaseState {
}

/**
 * @brief Controller view for Options Tab. The tab will contain multiple items related to options.
 */
export class OptionsTab extends Base.Component<IOptionsTabBaseProps, IOptionsTabBaseState> {

    public render(): JSX.Element {
        return (
            <ContainerTabBase.ContainerTabBase {...this.props}>
                <OptionsTabSharedView
                    defaultItems={this.getDefaultItems()}
                    cssClass="cd-options-tab-content" />
            </ContainerTabBase.ContainerTabBase>
        );
    }

    protected getDefaultItems(): Item[] {
        let items: Item[] = [];
        items.push(new GeneralOptionsItem(Resources.GeneralText));
        items.push(new IntegrationsOptionsItem(Resources.IntegrationsText));
        return items;
    }
}