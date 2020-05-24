import "VSS/LoaderPlugins/Css!TfsCommon/MobileNavigation/Navigation/Navigation";

import * as React from "react";
import * as VSS from "VSS/VSS";

import { Area, Feature } from "TfsCommon/Scripts/CustomerIntelligenceConstants";
import { WebAccessMobileConstants } from "VSS/Common/Constants/Platform";
import { setCookie } from "VSS/Utils/Core";
import { autobind } from "OfficeFabric/Utilities";

import * as Resources from "TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon";
import { INavigationProps, INavigationItem } from "TfsCommon/Scripts/MobileNavigation/Navigation/Navigation.Props";
import { Profile } from "TfsCommon/Scripts/MobileNavigation/Navigation/Profile";
import { NavigationEntry } from "TfsCommon/Scripts/MobileNavigation/Navigation/NavigationEntry";
import { getModel } from "TfsCommon/Scripts/MobileNavigation/Model";
import * as Telemetry from "VSS/Telemetry/Services";

import * as FeedbackComponent_Async from "TfsCommon/Scripts/Mobile/FeedbackComponent";

export class Navigation extends React.Component<INavigationProps, {}> {
    public render() {
        // Retrieve current navigation data every time it's rendered
        const model = getModel(1);

        return <nav className="navigation" role="navigation">
            <div className="navigation-top">
                <NavigationEntry
                    items={model.navigationItems}
                    selectedItemId={model.selectedKey}
                    postNavigation={this._navigationHandler} />
            </div>

            <div className="navigation-bottom">
                <Profile profile={model.staticNavigationItems.profile} />

                {/* Static menu items */}
                <NavigationEntry items={[
                    {
                        id: "static-signout",
                        title: Resources.MobileNavigation_Signout,
                        icon: "bowtie-icon bowtie-out-of-office",
                        href: model.staticNavigationItems.signOutHref
                    },
                    {
                        id: "static-feedback",
                        title: Resources.MobileNavigation_Feedback,
                        icon: "bowtie-icon bowtie-feedback-positive",
                        onClick: this._openFeedbackForm
                    },
                    {
                        id: "static-full-site",
                        title: Resources.MobileNavigation_Fullsite,
                        icon: "bowtie-icon bowtie-tvmonitor",
                        onClick: this._gotoFullSite
                    }
                ]} postNavigation={this._navigationHandler} />
            </div>
        </nav>;
    }

    @autobind
    private _gotoFullSite() {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(Area.MobileNavigation, Feature.SwitchToFullSite, {}), true);
        setCookie(WebAccessMobileConstants.BypassMobileCookieName, "");

        // Reload page to let the routing system select the correct page
        document.location.reload();
    }

    @autobind
    private _openFeedbackForm(item: INavigationItem) {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(Area.MobileNavigation, Feature.UserFeedbackClick, {}), true);

        // Load feedback component async
        VSS.using(["TfsCommon/Scripts/Mobile/FeedbackComponent"], (FeedbackComponent: typeof FeedbackComponent_Async) => {
            FeedbackComponent.showFeedbackDialog();
        }, VSS.handleError);

        // Also notify that we clicked on feedback so sidebar would slide back.
        this._navigationHandler(item);
    }

    @autobind
    private _navigationHandler(item: INavigationItem) {
        const { postNavigation } = this.props;

        if (postNavigation) {
            postNavigation(item);
        }
    }
}
