/// <reference types="react" />

import * as React from "react";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { GeneralOptionsStore, IGeneralOptionsState} from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/GeneralOptionsStore";
import { OptionsActionsCreator } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/OptionsActionsCreator";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { BadgeEnvironmentCheckListView } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/BadgeEnvironmentCheckListView";
import { EnvironmentCheckListView } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/EnvironmentCheckListView";
import { DataStoreInstanceIds } from "PipelineWorkflow/Scripts/Editor/Constants";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/IntegrationsOptionsDetailsView";

/**
 * @brief Properties for Deployment badge options details  view
 */
export interface IOptionsDetailsViewProps extends ComponentBase.IProps {
}

/**
 * @brief Controller view for Options details section
 */
export class IntegrationsOptionsDetailsView extends ComponentBase.Component<IOptionsDetailsViewProps, IGeneralOptionsState> {

    public componentWillMount(): void {
        this._optionsActions = ActionCreatorManager.GetActionCreator<OptionsActionsCreator>(OptionsActionsCreator);
        this._generalOptionsStore = StoreManager.GetStore<GeneralOptionsStore>(GeneralOptionsStore);
        this._generalOptionsStore.addChangedListener(this._onchange);

        this.setState(this._generalOptionsStore.getState());
    }

    public componentWillUnmount(): void {
        this._generalOptionsStore.removeChangedListener(this._onchange);
    }

    public render(): JSX.Element {
        return (
            <div className="cd-options-container">
                {this._getDeploymentStatus()}

                {this._getAutoLinkWorkItems()}

                {this._getBadgeStatus()}
            </div>
        );
    }

    private _getDeploymentStatus(): JSX.Element {
        return <EnvironmentCheckListView
            label={Resources.ReportEnvironmentDeploymentStatus}
            helpText={Resources.ReportEnvironmentDeploymentStatusHelpText}
            instanceId={DataStoreInstanceIds.PublishDeployStatus}
            placeholder={Resources.EnvironmentPickListPlaceholderText} />;
    }

    private _getAutoLinkWorkItems(): JSX.Element {
        return <EnvironmentCheckListView
                label={Resources.AutoLinkWorkItems}
                helpText={Resources.AutoLinkWorkItemsHelpText}
                instanceId={DataStoreInstanceIds.AutoLinkWorkItems}
                placeholder={Resources.EnvironmentPickListPlaceholderText} />;
    }

    private _getBadgeStatus(): JSX.Element {
        return <BadgeEnvironmentCheckListView
                label={Resources.BadgeLabelText}
                helpText={Resources.ReportBadgeHelpText}
                placeholder={Resources.EnvironmentPickListPlaceholderText}
                environmentBadgeText={Resources.EnvironmentBadgeText}
                searchBoxAriaLabelText={Resources.SearchBoxAriaLabelText}
                badgeUrlInfoMessageText={Resources.BadgeUrlInfoMessageText}
                instanceId={DataStoreInstanceIds.BadgeStatus} />;
    }

    private _onchange = () => {
        this.setState(this._generalOptionsStore.getState());
    }

    private _generalOptionsStore: GeneralOptionsStore;
    private _optionsActions: OptionsActionsCreator;
}
