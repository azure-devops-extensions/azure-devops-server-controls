
import "VSS/LoaderPlugins/Css!TfsCommon/Mobile/MobileBanner";

import * as React from "react";
import * as ReactDOM from "react-dom";

import * as ComponentBase from "VSS/Flux/Component";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Service from "VSS/Service";
import { Area, Feature } from "TfsCommon/Scripts/CustomerIntelligenceConstants";

import { WebAccessMobileConstants } from "VSS/Common/Constants/Platform";
import { HubsService } from "VSS/Navigation/HubsService";
import { LocationService } from "VSS/Navigation/Location";
import { deleteCookie } from "VSS/Utils/Core";

import { autobind } from "OfficeFabric/Utilities";
import * as Resources from "TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon";
import * as Telemetry from "VSS/Telemetry/Services";


interface IMobileBannerComponentProps extends ComponentBase.Props {
    /**
     * Message to display on the banner.
     */
    message?: string;
    /**
     * Hub id to navigate to when the banner is clicked.
     * If not specified, falls back to the 'targetRouteId'
     */
    targetHubId?: string;
    /**
     * Route id to navigate to when the banner is clicked.
     * If not specified, default to the selected hub (refresh current page).
     */
    targetRouteId?: string;
}

const mobileBannerClass = "mobile-banner";

class MobileBannerComponent extends React.Component<IMobileBannerComponentProps, {}> {

    public render(): JSX.Element {
        const message = this.props.message || Resources.MobileBannerMessage;
        return (
            <button onClick={this._onClick}>
                <div className="mobile-banner-control">
                    <span className="bowtie-icon bowtie-cellphone"/>
                    <span className="text ms-font-xl">{message}</span>
                </div>
            </button>
        );
    }

    public componentDidMount() {
        $("body").addClass(mobileBannerClass);
    }

    public componentWillUnmount() {
        $("body").removeClass(mobileBannerClass);
    }

    @autobind
    private _onClick() {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(Area.MobileNavigation, Feature.SwitchToMobile, {}), true);
        deleteCookie(WebAccessMobileConstants.BypassMobileCookieName);

        let uri: string | null = null;

        if (this.props.targetHubId) {
            const hubsService = Service.getLocalService(HubsService);
            const hubToNavigate = hubsService.getHubById(this.props.targetHubId);
            if (hubToNavigate && hubToNavigate.uri) {
                uri = hubToNavigate.uri;
            }
        } 

        if (!uri && this.props.targetRouteId) {
            const locationService = Service.getLocalService(LocationService);

            try {
                uri = locationService.routeUrl(this.props.targetRouteId, {});
            }
            catch {
                // Route not found
            }
        }

        if (uri) {
            window.location.href = uri;
        }
        else {
            window.location.reload(true);
        }
    }
}

SDK_Shim.registerContent("mobileBanner.initialize", (context) => {
    ReactDOM.render(
        <MobileBannerComponent
            message={context.options.contentProperties? context.options.contentProperties.message: null}
            targetHubId={context.options.contentProperties ? context.options.contentProperties.targetHubId : null}
            targetRouteId={context.options.contentProperties ? context.options.contentProperties.targetRouteId : null}
        />,
        context.container);

    const disposable = {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };

    return disposable;
});