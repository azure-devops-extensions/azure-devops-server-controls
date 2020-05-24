import "VSS/LoaderPlugins/Css!ReactForm";

import React = require("react");
import ReactDOM = require("react-dom");

import Q = require("q");

import VSS = require("VSS/VSS");
import VSSError = require("VSS/Error");
import Performance = require("VSS/Performance");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import * as Events_Services from "VSS/Events/Services";
import WitFormMode = require("WorkItemTracking/Scripts/Utils/WitControlMode");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import FormTabs = require("WorkItemTracking/Scripts/Form/Tabs");
import { LinksControl } from "WorkItemTracking/Scripts/Controls/Links/Control";
import { IWorkItemTypeExtension, IWorkItemInfoText } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import Utils_Array = require("VSS/Utils/Array");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Panels = require("VSS/Controls/Panels");
import FormModels = require("WorkItemTracking/Scripts/Form/Models");
import Controls = require("VSS/Controls");
import WorkItemViewContributionManager = require("WorkItemTracking/Scripts/Form/WorkItemViewContributionManager");
import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import ExtensionContracts = require("TFS/WorkItemTracking/ExtensionContracts");
import { getDefaultPageTitle } from "VSS/Navigation/Services";
import {
    DiscussionLayoutTransformation, HistoryControlTransformation, DeletedViewTransformation
} from "WorkItemTracking/Scripts/Form/LayoutTransformations/LayoutTransformations";
import { ReactFormRenderer, IReactFormRendererProps } from "WorkItemTracking/Scripts/Form/React/ReactFormRenderer";
import { LayoutInformation, IWorkItemFormLayoutTransformation } from "WorkItemTracking/Scripts/Form/Layout";
import * as WorkItemTypeColorAndIconUtils from "WorkItemTracking/Scripts/Utils/WorkItemTypeColorAndIconUtils";
import * as WorkItemTitleUtils from "WorkItemTracking/Scripts/Utils/WorkItemTitleUtils";

import { IWorkItemView } from "WorkItemTracking/Scripts/Controls/WorkItemForm";
import { FormEvents } from "WorkItemTracking/Scripts/Form/Events";

import getConnectionSpeed from "WorkItemTracking/Scripts/Form/Mobile/ConnectionSpeed";
import { IWorkItemViewBase } from "WorkItemTracking/Scripts/Controls/WorkItemFormBase";

/** Options that can be provided by a consumer */
export interface IReactWorkItemViewConfigurationOptions {
    /** Renderer type to use */
    rendererType?: new (...args: any[]) => ReactFormRenderer<any>;

    /** Additional layout transformations to apply */
    additionalLayoutTransformations?: IWorkItemFormLayoutTransformation[];
}

/** Options to be provided by the work item form */
export interface IReactWorkItemViewOptions extends IReactWorkItemViewConfigurationOptions {
    workItemType: WITOM.WorkItemType;
    extension: IWorkItemTypeExtension;

    isDeletedView: boolean;
}

export class ReactWorkItemView extends Controls.BaseControl implements IWorkItemViewBase {
    public _options: IReactWorkItemViewOptions;

    private _isAttached: boolean;

    public workItem: WITOM.WorkItem;
    public workItemType: WITOM.WorkItemType;
    public extension: IWorkItemTypeExtension;
    public controls: WorkItemControl[];
    public extensionInfo;
    protected _tfsContext: TFS_Host_TfsContext.TfsContext;
    private isDisabledView: boolean;
    public isDeletedView: boolean;
    protected _contributionManager: WorkItemViewContributionManager;

    private _windowResizeEventHandler: () => any;
    private _layout: LayoutInformation;
    private _workItemTypeColor: string;

    constructor(options?: IReactWorkItemViewOptions) {
        super(options);

        this.workItemType = this._options.workItemType;
        this._workItemTypeColor = WorkItemTypeColorAndIconUtils.getWorkItemTypeColor(this.workItemType);
        this.extension = this._options.extension;
        this.controls = [];
        this._tfsContext = this.workItemType.store.getTfsContext();
        this.isDeletedView = this._options.isDeletedView;

        this._contributionManager = new WorkItemViewContributionManager();

        this._attachEvents();
    }

    public initializeOptions(options?: IReactWorkItemViewOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "react-form"
        }, options));
    }

    public dispose(): void {
        super.dispose();

        if (this._isAttached) {
            ReactDOM.unmountComponentAtNode(this.getElement()[0]);
            this._isAttached = false;
        }

        this._detachEvents();
    }

    public beginAttachLayout(callback?: () => void): void {
        Diag.timeStamp("ModernRenderer.beginAttachLayout", Diag.StampEvent.Enter);

        if (!this._isAttached) {
            this._createLayout();
            this._isAttached = true;
        }

        this._render();
        this.showElement();

        if (!this._workItemTypeColor) {
            Q(WorkItemTypeColorAndIconUtils.beginGetWorkItemTypeColor(this.workItemType)).done(color => {
                this._workItemTypeColor = color || WorkItemTypeColorAndIconUtils.DefaultColor;

                // Re-render to propagate the color
                this._render();
            });
        }

        if (callback) {
            callback();
        }

        Diag.timeStamp("ModernRenderer.beginAttachLayout", Diag.StampEvent.Leave);
    }

    public detachLayout(): void {
        if (this._isAttached) {
            // We keep the layout in the DOM, just hide it for now            
            this.hideElement();
        }
    }

    private _createLayout(): void {
        var witLayout = <FormModels.ILayout>JSON.parse(this.workItemType.form);

        // Apply any given layout transformations before rendering
        const defaultLayoutTransformations = [
            new DeletedViewTransformation(this.isDeletedView),
            new DiscussionLayoutTransformation(),
            new HistoryControlTransformation()
        ];

        const layoutTransformations = defaultLayoutTransformations.concat(this._options.additionalLayoutTransformations || []);

        this._layout = new LayoutInformation(witLayout, { hideReadOnlyEmptyFields: witLayout.showEmptyReadOnlyFields !== true }, layoutTransformations);
    }

    public bind(workItem: WITOM.WorkItem, isDisabledView?: boolean): void {
        Diag.timeStamp("ReactWorkItemView.bind", Diag.StampEvent.Enter);

        this.workItem = workItem;
        this.isDisabledView = isDisabledView;

        this._registerFormChangeHandlers();

        // Re-render to propagate work item
        this._render();

        this._contributionManager.bind(workItem);

        Performance.getScenarioManager().recordPageLoadScenario("WIT", "ReactFormView", {
            "connectionSpeed": getConnectionSpeed()
        });
        Diag.timeStamp("ReactWorkItemView.bind", Diag.StampEvent.Leave);

        // Update window title with workitem title
        this._updateTitle();
    }

    private _render() {
        ReactDOM.render(
            React.createElement(this._getRendererType(), <IReactFormRendererProps>{
                workItemType: this.workItemType,
                workItemTypeColor: this._workItemTypeColor,
                layoutInformation: this._layout,
                contributionManager: this._contributionManager,
                workItem: this.workItem,
                isDisabledView: this.isDisabledView,
                id: this.getId()
            }),
            this.getElement()[0]);
    }

    public unbind(): void {
        this._detachFormChangeHandlers();
        this._contributionManager.unbind();
    }

    public getWorkItem(): WITOM.WorkItem {
        return this.workItem;
    }

    public suppressFieldUpdates(suppress?: boolean) {
        for (let control of this.controls) {
            control.suppressInvalidate = suppress;
        }
    }

    public fireEventToControlContributions(notificationAction: (notificationService: ExtensionContracts.IWorkItemNotificationListener, objectId: string) => void): void {
        this._contributionManager.getPromises().forEach((contributionHost) => {
            contributionHost.then((value) => {
                if (value.source) {
                    notificationAction(value.source, value.objectId);
                }
            });
        });
    }

    private _getRendererType(): new (...args) => ReactFormRenderer<any> {
        return this._options.rendererType || ReactFormRenderer;
    }

    private _registerFormChangeHandlers() {
        // Attach handler to update window title 
        if (this.workItem) {
            this.workItem.attachWorkItemChanged(this._updateTitle);
        }
    }

    private _detachFormChangeHandlers() {
        // Detach window title handler
        if (this.workItem) {
            this.workItem.detachWorkItemChanged(this._updateTitle);
        }
    }

    private _attachEvents() {
        const eventSvc = Events_Services.getService();
        this._windowResizeEventHandler = () => eventSvc.fire(FormEvents.LayoutResizedEvent(this.getId()));
        window.addEventListener("resize", this._windowResizeEventHandler);
    }

    private _detachEvents() {
        window.removeEventListener("resize", this._windowResizeEventHandler);
    }

    private _updateTitle = () => {
        const title = WorkItemTitleUtils.getWorkItemEditorTitle(this.workItem, WorkItemTitleUtils.DefaultTrimmedWorkItemEditorLength);
        document.title = getDefaultPageTitle(title);
    };
}