import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as Locations from "VSS/Locations";
import * as Service from "VSS/Service";
import * as Context from "VSS/Context";
import * as VSS from "VSS/VSS";

import * as SDK_Shim from "VSS/SDK/Shim";
import * as VSS_Controls from "VSS/Controls";
import { AdminPageContext } from "Admin/Scripts/AdminPageContext";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import "Admin/Scripts/TFS.Admin.Controls";

function renderCollectionAdminView(context: SDK_Shim.InternalContentContextData, options: { setTitle: boolean }): void {
    const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
    const pageData = pageDataService.getPageData<CollectionAdminViewComponentProps>("ms.vss-admin-web.admin-collection-home-data-provider");

    if (pageData && pageData.displayName && options.setTitle) {
        document.title = Navigation_Services.getDefaultPageTitle(pageData.displayName);
    }

    ReactDOM.render(
        <CollectionAdminViewComponent {...pageData} />,
        context.container);
}

SDK_Shim.registerContent("collectionAdminView.initialize", (context: SDK_Shim.InternalContentContextData): void => {
    renderCollectionAdminView(context, { setTitle: true });
});

SDK_Shim.registerContent("collectionAdminView.vertical", (context: SDK_Shim.InternalContentContextData): void => {
    // setting pageContext of type IVssPageContext so that it can be consumed by new web platform components
    AdminPageContext.setPageContext(context.options.pageContext);
    renderCollectionAdminView(context, { setTitle: false });
});

interface CollectionAdminViewComponentProps {
    displayName: string;
    description: string;
    collectionOverviewOptionsJson: string;
}

class CollectionAdminViewComponent extends React.Component<CollectionAdminViewComponentProps, {}> {

    private _ensureEnhancements = (ref: HTMLElement): void => {

        const $container = $(ref);
        $container.find("#json-collection-overview").html(this.props.collectionOverviewOptionsJson);

        VSS_Controls.Enhancement.ensureEnhancements();
    }

    public render(): JSX.Element {

        const isHosted = Context.getPageContext().webAccessConfiguration.isHosted;

        return (
            <div className="admin-overview" role="main" aria-level={1}>
                <div className="collection-overview collection-overview-control vertical-fill-layout" ref={this._ensureEnhancements}>
                    {
                        !isHosted &&
                        <div className="collection-management fixed-header">{ AdminResources.OnPremiseCollectionInfo }</div>
                    }
                    <div className="overview fill-content">
                        <div className="overview-profile">
                            <div className="header" role="heading" aria-level={2}>
                                <span className="account-collection">{ isHosted ? AdminResources.Account : AdminResources.Collection }</span>
                                <span className="profile-name"> / {this.props.displayName}</span>
                            </div>
                        
                            <div className="browse-info">
                                <div className="form-pair">
                                    <div className="form-key">{ AdminResources.Description }</div>
                                    <div className="form-value">{ this.props.description }</div>
                                </div>
                            </div>
                        </div>
                        <div className="overview-detail content">
                            <div className="fixed-header">
                                <div className="header" role="heading" aria-level={2}>{ AdminResources.Projects }</div>
                                <div className="actions-control toolbar"></div>
                            </div>
                            <div className="fill-content">
                                <div className="overview-grid-wrapper">
                                    <div className="projects-grid"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <script className="options" type="application/json" id="json-collection-overview"></script>
                </div>
            </div>
        );
    }
}