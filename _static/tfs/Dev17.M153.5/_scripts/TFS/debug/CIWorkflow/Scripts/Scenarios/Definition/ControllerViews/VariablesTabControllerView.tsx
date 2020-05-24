/// <reference types="react" />

import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import { ITabItemProps } from "DistributedTaskControls/Common/Types";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { VariablesTabBase } from "DistributedTaskControls/SharedViews/ContainerTabs/VariablesTab/VariablesTabBase";
import { CounterVariableItem } from "DistributedTaskControls/Variables/CounterVariables/CounterVariableItem";
import { PreDefinedVariablesLink } from "DistributedTaskControls/Variables/PreDefinedVariablesLink";
import { ProcessVariablesV2Item } from "DistributedTaskControls/Variables/ProcessVariablesV2/Item";
import { VariableGroupItem } from "DistributedTaskControls/Variables/VariableGroup/VariableGroupItem";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export interface IVariablesTabControllerViewProps extends ITabItemProps { }

/**
 * @brief Controller view for Variables Tab. The tab will contain multiple sections related to variables.
 */
export class VariablesTabControllerView extends VariablesTabBase {
    private static readonly PRE_DEFINED_VARIABLES_LINK = "https://go.microsoft.com/fwlink/?linkid=849035";

    protected getDefaultItems(): Item[] {
        const items: Item[] = [];
        items.push(new ProcessVariablesV2Item(DTCResources.ProcessVariablesText, {
            settableAtQueueTime: true,
            supportScopes: false,
            supportGridView: false
        }));

        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessBuildCIWorkflowVariableGroups)) {
            items.push(new VariableGroupItem({
                supportScopes: false
            }));
        }

        return items;
    }

    public getLeftFooter(): JSX.Element {
        return (
            <PreDefinedVariablesLink href={VariablesTabControllerView.PRE_DEFINED_VARIABLES_LINK} />
        );
    }
}
