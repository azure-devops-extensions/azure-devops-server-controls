// css
import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Policy/Scenarios/AdminPolicies/AdminPoliciesHub";
// libs
import * as ReactDOM from "react-dom";
import * as Controls from "VSS/Controls";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Service from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";
// contracts
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
// controls
import { AdminBranchPoliciesContainer } from "Policy/Scenarios/AdminPolicies/AdminBranchPoliciesContainer";
import { AdminInvalidPoliciesContainer } from "Policy/Scenarios/AdminPolicies/AdminInvalidPoliciesContainer";
// scenario
import { Flux } from "Policy/Scenarios/AdminPolicies/Flux";

SDK_Shim.VSS.register("policy.adminPoliciesHub", (context) => {
    return Controls.create(AdminPoliciesHub, context.$container, context.options);
});

export class AdminPoliciesHub extends Controls.Control<{}> {

    private _hubElement: HTMLElement;

    public initialize() {
        super.initialize();

        const tfsContext = TfsContext.getDefault();

        // Initialize flux

        const pageDataService = Service.getService(WebPageDataService);
        const pageData = pageDataService.getPageData<any>("ms.vss-code-web.admin-policies-data-provider");

        const flux = new Flux(tfsContext, pageData);

        // Bind action which prompts user when they're leaving with unsaved changes
        $(window).bind("beforeunload", flux.actionCreator.windowBeforeUnload);

        this._element.addClass("admin-policies-hub");

        // Generate the top-level page control

        this._hubElement = this._element[0];

        if (flux.storesHub.adminPoliciesHubStore.invalidScope
            || !flux.storesHub.adminPoliciesHubStore.refName) {
            // Helper page which points users to the Branches page to edit policies there

            // This is needed to build the "Go to branches page" link
            const defaultRepoInfo = pageDataService.getPageData<any>("ms.vss-code-web.navigation-data-provider");

            AdminInvalidPoliciesContainer.attachToDOM(this._hubElement, {
                tfsContext: tfsContext,
                defaultGitRepoName: defaultRepoInfo.defaultGitRepoName,
            });
        }
        else {
            // Contains all controls to edit policies on a branch scope

            AdminBranchPoliciesContainer.attachToDOM(this._hubElement, { flux: flux });

            // get preset configuration from the url if specified
            flux.actionCreator.getPresetConfiguration();
            flux.actionCreator.retrieveAllBuildDefinitionsAsync();
        }
    }

    protected _dispose(): void {
        super._dispose();

        if (this._hubElement) {
            ReactDOM.unmountComponentAtNode(this._hubElement);
        }
    }
}
