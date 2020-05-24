/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Controls from "VSS/Controls";
import * as SDK from "VSS/SDK/Shim";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { AppContext, AppCapability } from "DistributedTaskControls/Common/AppContext";
import { LoadingUtils } from "DistributedTaskControls/Common/LoadingUtils";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Feature } from "DistributedTaskControls/Common/Telemetry";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";

import { ReleaseEditorWebPageDataHelper } from "PipelineWorkflow/Scripts/Editor/Sources/ReleaseEditorWebPageData";
import { DeployPipelineDefinition } from "PipelineWorkflow/Scripts/Editor/Definition/Definition";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Extensions/Hub";

export interface IHubOptions {
    pageContext: Object;
}

export class Hub extends Controls.Control<IHubOptions> {

    public initialize(): void {

        this._disposeManagers();

        let capabilities: AppCapability[] = [
            AppCapability.Deployment,
            AppCapability.GreaterThanConditionInDemand,
            AppCapability.MultiplePhases,
            AppCapability.VariablesForTasktimeout,
            AppCapability.PhaseJobCancelTimeout
        ];

        if (FeatureFlagUtils.isMarketplaceExtensionSupportEnabled()) {
            capabilities.push(AppCapability.MarketplaceExtensions);
        }

        if (FeatureFlagUtils.isShowTaskGroupDemandsEnabled()) {
            capabilities.push(AppCapability.ShowTaskGroupDemands);
        }

        AppContext.instance().Capabilities = capabilities;
        AppContext.instance().PageContext = this._options.pageContext;

        ReleaseEditorWebPageDataHelper.instance().initialize("ms.vss-releaseManagement-web.cdworkflow.webpage.data-provider");

        // TODO: Work with open ALM to identify the best way to set the direction property. 
        // For now setting it here to ensure that all office fabric styles work properly
        // This will not have any side effect on other elements because the dir="ltr" is set
        // on all pages that inherit from TFS master page.
        $("html").attr("dir", "ltr");

        // The default min width of main container is set to 1024px. This causes multiple horizontal
        // scrollbars when the window is resized. Setting this to a lower min-width to ensure that 
        // multiple horizontal scrollbars do not come often.
        let element: JQuery = $(".main-container > .main");
        if (element.length >= 0) {
            element.css("min-width", "700px");
        }

        this.getElement().addClass("cd-workflow");
        // Increasing wait time to avoid flickers during create rd
        LoadingUtils.instance().createLoadingControl("cd-loading-container", true, 500);

        this._deployPipelineDefinition =
            Controls.Control.create(
                DeployPipelineDefinition,
                this.getElement(),
                {});
    }

    public dispose() {
        if (this._deployPipelineDefinition) {
            this._deployPipelineDefinition.dispose();
            this._deployPipelineDefinition = null;
        }

        TaskDefinitionSource.instance().disposeTaskDefinitionCache();

        this._disposeManagers();


        ReleaseEditorWebPageDataHelper.dispose();
        super.dispose();
    }

    private _disposeManagers(): void {
        StoreManager.dispose();
        ActionCreatorManager.dispose();
        SourceManager.dispose();
    }

    private _deployPipelineDefinition: DeployPipelineDefinition;
}

/**
 * @brief Registering the Hub to contribution
 */
SDK.registerContent("cd-workflow-hub", (context) => {
    return Controls.Control.create<Hub, IHubOptions>(Hub, context.$container, {
        pageContext: context.options._pageContext
    });
});

