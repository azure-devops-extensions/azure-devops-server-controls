import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Contribution_Services from "VSS/Contributions/Services";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as Service from "VSS/Service";
import * as Context from "VSS/Context";
import * as VSS from "VSS/VSS";

import * as SDK_Shim from "VSS/SDK/Shim";
import * as VSS_Controls from "VSS/Controls";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";

import "Admin/Scripts/TFS.Admin.Controls";

function renderSettingsView(context: SDK_Shim.InternalContentContextData, options: { setTitle: boolean }): IDisposable {
    const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
    const pageData = pageDataService.getPageData<SettingsViewComponentProps>("ms.vss-admin-web.collection-overview-data-provider");
    
    if (options.setTitle) {
        document.title = Navigation_Services.getDefaultPageTitle(AdminResources.Settings);
    }
    
    ReactDOM.render(
        <SettingsViewComponent {...pageData} />,
        context.container);

    const disposable = {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };

    return disposable;

}

SDK_Shim.registerContent("settingsView.initialize", (context: SDK_Shim.InternalContentContextData): IDisposable => {
    return renderSettingsView(context, { setTitle: true });
});

SDK_Shim.registerContent("settingsView.vertical", (context: SDK_Shim.InternalContentContextData): IDisposable => {
    return renderSettingsView(context, { setTitle: false });
});

interface SettingsViewComponentProps {
    accountTrialInformationDataJson: string;
    accountAadInformationDataJson: string;
}

class SettingsViewComponent extends React.Component<SettingsViewComponentProps, {}> {

    private _ensureEnhancements = (ref: HTMLElement): void => {

        const $container = $(ref);
        $container.find(".accountTrialInformationData").html(this.props.accountTrialInformationDataJson);
        $container.find(".AccountAadInformationData").html(this.props.accountAadInformationDataJson);
        VSS.globalProgressIndicator.registerProgressElement($container.find(".pageProgressIndicator"));

        VSS_Controls.Enhancement.ensureEnhancements();
    }

    public render(): JSX.Element {

        return (
            <div className="hub-view" ref={this._ensureEnhancements}>
                <div className="hub-title" role="heading" aria-level={1}>{AdminResources.Settings}</div>
                <div className="hub-progress pageProgressIndicator"></div>
                <div className="hub-content">
                    <script className="accountTrialInformationData" type="application/json"></script>
                    <script className="AccountAadInformationData" type="application/json"></script>
                    <div className="account-settings-container">
                        <div className="toolbar hub-pivot-toolbar"></div>
                        <div className="message-area-container">
                            <div className="message-area"></div>
                        </div>
                        <div className="settings-control"></div>
                    </div>
                </div>
            </div>
        );
    }
}