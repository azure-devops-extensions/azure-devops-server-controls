import * as Q from "q";

import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Controls from "VSS/Controls";
import { Dialog, IModalDialogOptions, ModalDialogO } from "VSS/Controls/Dialogs";
import * as Service from "VSS/Service";

import { ConnectToFeedTabControlIds } from "Feed/Common/Constants/Constants";
import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import {
    ITabContent,
    ITabControlOption,
    ITabGroupRegistration,
    ITabRegistration,
    TabControl,
    TabControlSavingMode,
    TabControlsRegistration
} from "Package/Scripts/External/AgileConfigurations";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { UpstreamClientTool } from "Package/Scripts/Protocols/Upstream/UpstreamClientTool";
import * as PackageResources from "Feed/Common/Resources";
import { HubAction } from "Package/Scripts/Types/IHubState";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Dialogs/ConnectToFeedDialog";

export class TabContentReactShell implements ITabContent {
    private _reactContent: React.ReactNode;

    constructor(reactContent: React.ReactNode) {
        this._reactContent = reactContent;
    }

    /**
     * This method is called when user clicks on the tab for the first time.
     */
    public beginLoad($container: JQuery): IPromise<{}> {
        ReactDOM.render(
            React.createElement("div", { className: "connect-to-feed-tab" }, this._reactContent),
            $container[0]
        );
        return Q({});
    }

    /**
     * Indicates if the control is dirty
     */
    public isDirty(): boolean {
        return false;
    }
}

export interface IConnectToFeedDialogOptions extends IModalDialogOptions {
    feed: Feed;
    feedViews: FeedView[];
    protocolDictionary: { [id: string]: IPackageProtocol };
    defaultTabId: string;
    hubAction: HubAction;
}

export class ConnectToFeedDialog extends ModalDialogO<IConnectToFeedDialogOptions> {
    private static hasRegistered: boolean = false;

    private _control: TabControl;

    private _feed: Feed;
    private _feedViews: FeedView[];
    private _hubAction: HubAction;
    private _protocolDictionary: { [id: string]: IPackageProtocol };
    private _webPageDataService: HubWebPageDataService;

    public static show(options?: any): any {
        return Dialog.show(ConnectToFeedDialog, options);
    }

    constructor(options?: IConnectToFeedDialogOptions) {
        super(options);
        this._feed = options.feed;
        this._feedViews = options.feedViews;
        this._protocolDictionary = options.protocolDictionary;
        this._hubAction = options.hubAction;
        this._webPageDataService = Service.getLocalService(HubWebPageDataService);
    }

    public initializeOptions(options?: IConnectToFeedDialogOptions): void {
        super.initializeOptions(
            $.extend(
                {
                    buttons: {
                        close: {
                            id: "cancel",
                            class: "default",
                            text: PackageResources.Dialog_CloseButtonText,
                            click: () => this.close()
                        }
                    },
                    widthPct: 0.6,
                    minWidth: 800,
                    heightPct: 0.75,
                    minHeight: 700,
                    noAutoCta: true,
                    resizable: true,
                    dynamicSize: true,
                    dialogClass: "bowtie configuration-dialog connect-to-feed-dialog",
                    initialFocusSelector: "new-connect-container"
                },
                options
            )
        );
    }

    public initialize(): void {
        super.initialize();

        // TODO: Check for view and set title to "Connect to view"
        this.setTitle(PackageResources.ConnectToFeed_Title);

        const tabCollectionOption: ITabControlOption = {
            id: ConnectToFeedTabControlIds.TAB_CONTROL_ID,
            defaultTabId: this._options.defaultTabId,
            savingMode: TabControlSavingMode.NONE
        };

        if (ConnectToFeedDialog.hasRegistered) {
            TabControlsRegistration.clearRegistrations();
        }

        this._registerTabGroup();
        this._registerProtocolTabs();
        ConnectToFeedDialog.hasRegistered = true;

        this._control = Controls.Control.createIn<ITabControlOption>(
            TabControl,
            this.getElement(),
            tabCollectionOption
        ) as TabControl;

        $(".connect-to-feed-dialog")
            .find(".dialog")
            .attr("aria-label", PackageResources.AriaLabel_ConnectToFeed_Dialog);
        $(".connect-to-feed-dialog")
            .find(".tabs-titles")
            .attr("aria-label", PackageResources.AriaLabel_ConnectToFeed_Tabs);
        const tabs = $(".connect-to-feed-dialog").find(".tab-title");
        $(tabs).each((i, tab) => {
            $(tab)
                .attr("aria-posinset", i + 1)
                .attr("aria-setsize", tabs.length);
        });
    }

    private _registerTabGroup(): void {
        const group: ITabGroupRegistration = {
            tabControlId: ConnectToFeedTabControlIds.TAB_CONTROL_ID,
            id: ConnectToFeedTabControlIds.TAB_GROUP_ID,
            title: ""
        };
        TabControlsRegistration.registerTabGroup(group);
    }

    private _registerProtocolTabs(): void {
        let index = 1;
        let supportsUpstream = false;
        // tslint:disable-next-line:forin
        for (const protocolKey in this._protocolDictionary) {
            const protocol = this._protocolDictionary[protocolKey];
            if (protocol.supportsUpstreams(this._options.feed)) {
                supportsUpstream = true;
            }

            protocol.clients.forEach(client => {
                const vssIconProps = client.vssIconProps || protocol.vssIconProps;

                const protocolTabOptions: ITabRegistration<React.ReactNode> = {
                    groupId: ConnectToFeedTabControlIds.TAB_GROUP_ID,
                    id: client.name,
                    title: client.name,
                    iconProps: vssIconProps,
                    order: index,
                    tabContent: TabContentReactShell,
                    tabContentOptions: client.getConnectPanel(this._feed, this._feedViews, this._hubAction)
                };

                index++;

                TabControlsRegistration.registerTab(protocolTabOptions);
            });
        }

        // Add Feed as Upstream
        if (this._webPageDataService.isOrganizationUpstreamsEnabled() && supportsUpstream) {
            const upstreamClient = new UpstreamClientTool();
            const upstreamTabOptions: ITabRegistration<React.ReactNode> = {
                groupId: ConnectToFeedTabControlIds.TAB_GROUP_ID,
                id: upstreamClient.name,
                title: upstreamClient.name,
                iconProps: upstreamClient.vssIconProps,
                order: index++,
                tabContent: TabContentReactShell,
                tabContentOptions: upstreamClient.getConnectPanel(this._feed, this._feedViews, this._hubAction)
            };
            TabControlsRegistration.registerTab(upstreamTabOptions);
        }
    }

    public onCancelClick(e?: JQueryEventObject): void {
        this.close();
    }

    public dispose(): void {
        if (this._control) {
            this._control.dispose();
            this._control = null;
        }
        super.dispose();
    }
}
