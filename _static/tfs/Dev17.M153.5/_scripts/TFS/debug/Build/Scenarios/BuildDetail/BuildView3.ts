import { BuildClientService } from "Build.Common/Scripts/ClientServices";
import { IBuildClient } from "Build.Common/Scripts/IBuildClient";
import { BuildLinks } from "Build.Common/Scripts/Linking";

import { ViewContext, buildDetailsContext } from "Build/Scripts/Context";
import { BuildDefinitionManager } from "Build/Scripts/DefinitionManager";
import { PageLoadScenarios } from "Build/Scripts/Performance";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { SourceProviderManager } from "Build/Scripts/SourceProviderManager";
import { BuildView2 } from "Build/Scripts/Views";
import { BuildViewType } from "Build/Scripts/Views.Common";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as Controls from "VSS/Controls";
import * as Events_Action from "VSS/Events/Action";
import { VssConnection } from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

export class BuildView3 extends BuildView2 {
    initialize(): void {
        super.initialize();

        this._element.attr("role", "main");

        buildDetailsContext.currentBuild.subscribe((build) => {
            let buildNumber: string = "";
            if (build) {
                buildNumber = build.buildNumber();
            }

            document.title = Utils_String.format(BuildResources.BuildDetailPageTitleFormat, buildNumber);
        });
    }

    protected getPageLoadScenarioName(): string {
        return PageLoadScenarios.BuildDetails;
    }

    protected getViewType(): BuildViewType {
        return BuildViewType.Result;
    }

    protected createBuildClient(): IBuildClient {
        const tfsConnection = new VssConnection(this._options.tfsContext.contextData);
        return tfsConnection.getService<BuildClientService>(BuildClientService);
    }

    protected createViewContext(sourceProviderManager: SourceProviderManager, buildDefinitionManager: BuildDefinitionManager, buildClient: IBuildClient): ViewContext {
        // no XAML here. passing a null XAML client
        return new ViewContext(this._options.tfsContext, sourceProviderManager, buildDefinitionManager, buildClient, null, this._viewDefinition, this._editDefinition, this._showAddTaskDialog);
    }

    private _viewDefinition(definitionId: number): void {
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
            url: BuildLinks.getDefinitionLink(definitionId)
        });
    }

    private _editDefinition(definitionId: number): void {
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
            url: BuildLinks.getDefinitionEditorLink(definitionId)
        });
    }

    private _showAddTaskDialog(definitionId: number, addTask: string): void {
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
            url: BuildLinks.getDefinitionEditorLink(definitionId, null, { addTask: addTask })
        });
    }
}

// hack to select Definitions instead of Explorer. remove this silliness when contributed hubs can be "selected" at more than one URL
let definitionsHub = $("[data-hubid='ms.vss-build-web.build-definitions-hub']");
if (definitionsHub.length > 0) {
    definitionsHub.addClass("selected");

    let hubs = definitionsHub.parent();
    hubs.children().each((index: number, hub: Element) => {
        if (hub !== definitionsHub[0]) {
            $(hub).removeClass("selected");
        }
    });
}

VSS.classExtend(BuildView3, TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(BuildView3, ".buildvnext-view");