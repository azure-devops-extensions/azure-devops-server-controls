import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { AppContext, AppCapability } from "DistributedTaskControls/Common/AppContext";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";

import { ReleaseProgressView } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseProgressView";
import { ReleaseProgressDataHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseProgressData";

import * as Controls from "VSS/Controls";
import * as SDK from "VSS/SDK/Shim";

export interface IReleaseProgressExtensionOptions {
    pageContext: Object;
}

export class ReleaseProgressExtension extends Controls.Control<IReleaseProgressExtensionOptions> {

    public initialize(): void {
        this._disposeManagers();

        AppContext.instance().Capabilities = [AppCapability.Deployment, AppCapability.GreaterThanConditionInDemand, AppCapability.MultiplePhases, AppCapability.VariablesForTasktimeout, AppCapability.PhaseJobCancelTimeout];
        AppContext.instance().PageContext = this._options.pageContext;
        ReleaseProgressDataHelper.instance().initialize("ms.vss-releaseManagement-web.releaseview.webpage.data-provider");

        this.getElement().addClass("release-progress-container");
        this._releaseProgressView = Controls.create(ReleaseProgressView, this.getElement(), {});
    }

    public dispose() {
        if (this._releaseProgressView) {
            this._releaseProgressView.dispose();
            this._releaseProgressView = null;
        }

        TaskDefinitionSource.instance().disposeTaskDefinitionCache();

        this._disposeManagers();
        ReleaseProgressDataHelper.dispose();
        super.dispose();
    }

    private _disposeManagers(): void {
        StoreManager.dispose();
        ActionCreatorManager.dispose();
        SourceManager.dispose();
    }

    private _releaseProgressView: ReleaseProgressView;
}

/**
 * @brief Registering the Hub to contribution
 */
SDK.registerContent("cd-release-progress", (context: SDK.InternalContentContextData) => {
    return Controls.Control.create<ReleaseProgressExtension, {}>(ReleaseProgressExtension, context.$container, {
        pageContext: context.options._pageContext
    } as IReleaseProgressExtensionOptions);
});
