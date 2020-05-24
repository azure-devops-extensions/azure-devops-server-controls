/// <reference types="react" />
/// <reference types="react-dom" />

import * as Events_Services from "VSS/Events/Services";
import { HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import * as React from "react";
import * as ReactDOM from "react-dom";

export function updateHeaderState(): void {
    const hubsWithHeader = {
        "ms.vss-tfs-web.collection-projects-hub": 1,
        "ms.vss-tfs-web.collection-favorites-hub": 2,
        "ms.vss-tfs-web.collection-work-hub": 3,
        "ms.vss-tfs-web.collection-pullrequests-hub": 4,
        "ms.vss-tfs-web.collection-pullrequests-new-hub": 5,
    };

    $('body').addClass('my-experience-page');
    $(".vsts-header", $(".main-container")).addClass('account-home-script-loaded');

    var onXhrNavigate = (sender: any, args: IHubEventArgs) => {
        Events_Services.getService().detachEvent(HubEventNames.PreXHRNavigate, onXhrNavigate);
        if (!hubsWithHeader[args.hubId]) {
            $('body').removeClass('my-experience-page');
            $(".vsts-header", $(".main-container")).removeClass('account-home-script-loaded');
            $(".left-section", $(".l1", $(".vsts-header", $(".main-container")))).css("display", "table-cell");
            $(".center-section", $(".l1", $(".vsts-header", $(".main-container")))).css("display", "table-cell");
        }
    };

    Events_Services.getService().attachEvent(HubEventNames.PreXHRNavigate, onXhrNavigate);
}

export class TopLevelReactManager {
    private static containers: HTMLElement[] = [];


    public static attachCleanUpEvents(): void {
        const hubsWithHeader = {
            "ms.vss-tfs-web.collection-projects-hub": 1,
            "ms.vss-tfs-web.collection-favorites-hub": 2,
            "ms.vss-tfs-web.collection-work-hub": 3,
            "ms.vss-tfs-web.collection-pullrequests-hub": 4,
            "ms.vss-tfs-web.collection-pullrequests-new-hub": 5,
        };

        var onXhrNavigate = (sender: any, args: IHubEventArgs) => {
            Events_Services.getService().detachEvent(HubEventNames.PostXHRNavigate, onXhrNavigate);
            if (hubsWithHeader[args.hubId]) {
                for (let node of TopLevelReactManager.containers) {
                    ReactDOM.unmountComponentAtNode(node);
                }
            }
        };

        Events_Services.getService().attachEvent(HubEventNames.PostXHRNavigate, onXhrNavigate);
    }

    public static renderTopLevelReact(component: React.ReactElement<any>, container: HTMLElement): void {
        TopLevelReactManager.containers.push(container);

        ReactDOM.render(
            component, container);
    }
}