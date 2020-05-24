import "VSS/LoaderPlugins/Css!TfsCommon/Navigation/GlobalMessages";

import { getSharedData } from "VSS/Contributions/LocalPageData";
import Contributions_Controls = require("VSS/Contributions/Controls");
import Contributions_Services = require("VSS/Contributions/Services");
import Events_Services = require("VSS/Events/Services");
import { HubsService, HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import Navigation_Common = require("TfsCommon/Scripts/Navigation/Common");
import Resources = require("TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon");
import SDK_Shim = require("VSS/SDK/Shim");
import Service = require("VSS/Service");
import VSS = require("VSS/VSS");

import SettingsRestClient_Async = require("VSS/Settings/RestClient");

interface GlobalMessagesData {
    actions: GlobalMessageAction[];
    banners: GlobalMessageBanner[];
}

interface GlobalMessageBanner {
    _links?: any;
    contentContributionId?: string;
    contentProperties?: Object;
    customIcon?: string;
    dismissable?: boolean;
    level?: string | number;
    message?: string;
    settingId?: string;
    position?: string;
}

interface GlobalMessageAction {
    contentContributionId?: string;
    contentProperties?: Object;
}

const globalMessagesSharedDataKey = "globalMessageData";
const globalBannerDismissedSettingPrefix = "GlobalMessage/Dismissed/";

function getMessageLevelString(level: string | number): string {
    if (typeof level === "string") {
        return level;
    }

    switch (level) {
        case 0: // info
            return "info";
        case 1: // warning
            return "warning";
        case 2: // error
            return "error";
        default:
            return "";
    }
}

function showGlobalMessages() {
    
    let contributionDataSvc = Service.getService(Contributions_Services.WebPageDataService);
    let globalMessagesData = getSharedData<GlobalMessagesData>(globalMessagesSharedDataKey);

    if (globalMessagesData) {
        // instantiate banners
        if (globalMessagesData.banners && globalMessagesData.banners.length > 0) {
            let banner = globalMessagesData.banners[0];

            var onDismiss = () => {
                VSS.globalMessageIndicator.clearGlobalMessages();

                if (banner.settingId) {
                    const settingEntries: IDictionaryStringTo<any> = {};

                    settingEntries[globalBannerDismissedSettingPrefix + banner.settingId] = true;

                    VSS.using(["VSS/Settings/RestClient"], (SettingsRestClient: typeof SettingsRestClient_Async) => {
                        const settingsClient = Service.getClient(SettingsRestClient.SettingsHttpClient);
                        settingsClient.setEntries(settingEntries, "me");
                    });
                }
            };

            let globalMessageElem = VSS.globalMessageIndicator.updateGlobalMessageIfEmpty(
                banner.message || "",
                getMessageLevelString(banner.level) || "info",
                banner.customIcon,
                banner.dismissable ? onDismiss : null,
                typeof banner.position === "number" ? banner.position : (banner.position ? VSS.GlobalMessagePosition[banner.position.toLowerCase()]: null)
            );

            if (globalMessageElem) {
                let $globalMessageContainer = $(globalMessageElem);
                $globalMessageContainer.addClass("bowtie-fabric nav-global-message");

                let $messageContent = $globalMessageContainer.find(".message-section");
                let $fillElement = $messageContent;

                if (banner._links && banner._links.learn) {
                    $fillElement = $("<a class='banner-link' target='_blank' rel='noopener' />")
                        .text(Resources.LearnMore)
                        .insertAfter($messageContent)
                        .attr("href", banner._links.learn.href);
                }

                if (banner.contentContributionId) {
                    $fillElement = $("<span class='nav-message-content' />").appendTo($globalMessageContainer);
                    Contributions_Controls.createContributedControl(
                        $fillElement,
                        banner.contentContributionId,
                        {
                            ownsContainer: true,
                            contentProperties: banner.contentProperties,
                            onDismiss: () => {
                                VSS.globalMessageIndicator.clearGlobalMessages();
                            }
                        });
                }

                $fillElement.addClass("fill-content");
            }
        }

        // instantiate actions
        if (globalMessagesData.actions) {
            for (let action of globalMessagesData.actions) {
                Contributions_Controls.createContributedControl(
                    $("<div />"),
                    action.contentContributionId,
                    {
                        contentProperties: action.contentProperties
                    });
            }
        }
    }
}

SDK_Shim.registerContent("navbar.globalMessages", (context) => {

    Events_Services.getService().attachEvent(HubEventNames.PreXHRNavigate, (sender: any, args: IHubEventArgs) => {
        VSS.globalMessageIndicator.clearGlobalMessages();
    });

    Events_Services.getService().attachEvent(HubEventNames.ProcessXHRNavigate, (sender: any, args: IHubEventArgs) => {
        showGlobalMessages();
    });

    showGlobalMessages();
});
