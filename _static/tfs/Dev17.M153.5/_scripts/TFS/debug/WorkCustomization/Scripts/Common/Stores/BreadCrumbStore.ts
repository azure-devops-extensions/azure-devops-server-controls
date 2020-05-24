import * as BaseStore from "VSS/Flux/Store";
import { getWorkItemTypesStore, WorkItemTypesStore, IWorkItemTypeData }
    from "WorkCustomization/Scripts/Stores/Process/WorkItemTypesStore";
import { IBreadcrumbItem } from "OfficeFabric/BreadCrumb";
import { endGetWorkItemTypeAction, endGetWorkItemTypesAction, IGetWorkItemTypesPayload } from "WorkCustomization/Scripts/Actions/WorkItemTypesActions";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import * as React from "react";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { autobind } from "OfficeFabric/Utilities";

export class BreadCrumbStore extends BaseStore.Store {
    private _wiTypeStore: WorkItemTypesStore;

    constructor() {
        super();
        this._wiTypeStore = getWorkItemTypesStore();
        this._addListeners();
    }

    @autobind
    private _onBreadcrumbClick(ev: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) {
        UrlUtils.checkRunningDocumentsTable(ev.nativeEvent);

    }

    public getItems(): IBreadcrumbItem[] {
        let items: IBreadcrumbItem[] = [];

        items.push({
            text: Resources.AllProcessesText,
            key: "all",
            href: UrlUtils.getAllProcessesCurrentPivotUrl(),
            onClick: this._onBreadcrumbClick
        });

        if (UrlUtils.isProcessOverviewPage()) {
            let currentProcessName = UrlUtils.getCurrentProcessNameFromUrl();

            items.push({
                text: currentProcessName,
                key: currentProcessName,
                href: UrlUtils.getProcessWorkItemTypeCurrentPivotUrl(currentProcessName),
                onClick: this._onBreadcrumbClick
            });
        }
        else if (UrlUtils.isWorkItemTypeDetailsPage()) {
            let currentProcessName = UrlUtils.getCurrentProcessNameFromUrl();

            items.push({
                text: currentProcessName,
                key: currentProcessName,
                href: UrlUtils.getProcessWorkItemTypesUrl(currentProcessName),
                onClick: this._onBreadcrumbClick
            });

            let currentWorkItemType = this._wiTypeStore.getCurrentWorkItemType();
            if (currentWorkItemType) {
                items.push({
                    text: currentWorkItemType.workItemType.name,
                    key: currentWorkItemType.workItemType.referenceName,
                    href: UrlUtils.getWorkItemTypeCurrentPivotUrl(currentProcessName, currentWorkItemType.workItemType.referenceName),
                    onClick: this._onBreadcrumbClick
                })
            }
        }

        items[items.length - 1].isCurrentItem = true;
        items[items.length - 1].onClick = null;

        return items;
    }

    public dispose(): void {
        this._removeListeners();
    }

    private _addListeners(): void {
        endGetWorkItemTypesAction.addListener(this._onWitLoaded, this);
        endGetWorkItemTypeAction.addListener(this._onWitLoaded, this);
    }

    private _removeListeners(): void {
        endGetWorkItemTypesAction.removeListener(this._onWitLoaded);
        endGetWorkItemTypeAction.removeListener(this._onWitLoaded);
    }

    private _onWitLoaded(payload): void {
        this.emitChanged();
    }
}
