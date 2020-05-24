import "VSS/LoaderPlugins/Css!WorkItemArea";

import Q = require("q");

import React = require("react");
import ReactDOM = require("react-dom");

import Utils_Core = require("VSS/Utils/Core");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Models = require("WorkItemTracking/Scripts/Form/Models");
import Grids = require("WorkItemTracking/Scripts/Form/Grids");
import Events = require("WorkItemTracking/Scripts/Form/Events");
import Panels = require("VSS/Controls/Panels");
import Tabs = require("WorkItemTracking/Scripts/Form/Tabs");
import VSS = require("VSS/VSS");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Menus = require("VSS/Controls/Menus");
import Utils_Array = require("VSS/Utils/Array");
import Utils_UI = require("VSS/Utils/UI");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import WorkItemViewContributionManager = require("WorkItemTracking/Scripts/Form/WorkItemViewContributionManager");
import CopyWorkItemLinkControl = require("WorkItemTracking/Scripts/Controls/WorkItemForm/CopyWorkItemLinkControl");
import DiscussionAdornmentControl = require("WorkItemTracking/Scripts/Controls/WorkItemForm/DiscussionAdornmentControl");
import FormRenderer = require("WorkItemTracking/Scripts/Form/Renderer");
import FormRendererHelpers = require("WorkItemTracking/Scripts/Utils/FormRendererHelpers");
import Events_Services = require("VSS/Events/Services");
import Contributions_Controls = require("VSS/Contributions/Controls");
import { WitFormModeUtility, isNewDiscussionMaximizable } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import { FreshnessIndicatorDisplayMode } from "WorkItemTracking/Scripts/Controls/WorkItemForm/FreshnessIndicatorControl";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { IWorkItemControlOptions, WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { WorkItemLabel } from "WorkItemTracking/Scripts/Controls/WorkItemForm/LabelControl";
import { isContribution } from "WorkItemTracking/Scripts/Form/Contributions";
import { FormLayoutType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

import { getService } from "VSS/Events/Services";
import { FormEvents } from "WorkItemTracking/Scripts/Form/Events";

import { autobind } from "OfficeFabric/Utilities";

import * as FormLayout from "WorkItemTracking/Scripts/Form/Layout";

import {
    IWorkItemFormComponentContext, IWorkItemFormContextProvider, WorkItemContextProviderPropTypes, IWorkItemFormContext, WorkItemFormContextProvider
} from "WorkItemTracking/Scripts/Form/React/FormContext";

import { WorkItemControlAdapterComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemControlAdapterComponent";
import { ContributedWorkItemControlComponent } from "WorkItemTracking/Scripts/Form/React/Components/ContributedWorkItemControlComponent";

import { TabComponent } from "WorkItemTracking/Scripts/Form/React/Components/TabComponent";
import { PageComponent } from "WorkItemTracking/Scripts/Form/React/Components/PageComponent";
import { ContributedPageComponent } from "WorkItemTracking/Scripts/Form/React/Components/ContributedPageComponent";

export interface IReactFormRendererProps {
    workItemType: WITOM.WorkItemType;
    workItemTypeColor: string;

    layoutInformation: FormLayout.LayoutInformation;
    contributionManager: WorkItemViewContributionManager;

    workItem?: WITOM.WorkItem;
    isDisabledView?: boolean;

    id: string;
}

/** Base React work item form renderer */
export class ReactFormRenderer<TState> extends React.Component<IReactFormRendererProps, TState> {
    static childContextTypes = WorkItemContextProviderPropTypes;

    protected _contextProvider: IWorkItemFormContextProvider;

    protected _tabs: TabComponent<FormLayout.ILayoutPage>;
    protected _resolveTabs = (tabs: TabComponent<FormLayout.ILayoutPage>) => this._tabs = tabs;
    protected _renderTab = (tab: FormLayout.ILayoutPage) => this._renderPage(tab);

    constructor(props: IReactFormRendererProps, context?: any) {
        super(props, context);

        this._contextProvider = new WorkItemFormContextProvider(ReactFormRenderer._getFormContext(props, this._getFormLayoutType()))
    }

    public componentWillReceiveProps(nextProps: IReactFormRendererProps) {
        this._updateContext(nextProps);
    }

    public getChildContext(): IWorkItemFormComponentContext {
        return {
            provider: this._contextProvider
        };
    }

    protected _getFormLayoutType(): FormLayoutType {
        return FormLayoutType.Desktop;
    }

    protected _updateContext(props: IReactFormRendererProps) {
        this._contextProvider.setFormContext(ReactFormRenderer._getFormContext(props, this._getFormLayoutType()));
    }

    public render(): JSX.Element {
        return <div className="form-grid witform-layout work-item-form-main">
            {this._renderPage(this.props.layoutInformation.layout.pages[0])}
        </div>;
    }

    @autobind
    protected _showTab(page: FormLayout.ILayoutPage) {
        this._tabs.setActiveTab(page, () => {
            // Notify controls that page is now active
            getService().fire(FormEvents.PageActivated(this.props.id, page.id));
        });
    }

    protected _renderPage(page: FormLayout.ILayoutPage): JSX.Element {
        if (isContribution(page)) {
            return <ContributedPageComponent page={page} />;
        }
        else {
            return <PageComponent page={page} layout={this.props.layoutInformation} renderControl={this._renderControl} />;
        }
    }

    protected _getControlKey(control: FormLayout.ILayoutControl): string {
        return control.controlOptions && control.controlOptions.controlId || (control.id || control.controlType);
    }

    protected _renderControl = (pageId: string, control: FormLayout.ILayoutControl): JSX.Element => {
        if (isContribution(control)) {
            return <ContributedWorkItemControlComponent control={control} key={this._getControlKey(control)} />
        }

        return <WorkItemControlAdapterComponent
            key={this._getControlKey(control)}
            pageId={pageId}
            control={control} />
    }

    protected static _getFormContext(props: IReactFormRendererProps, layoutType: FormLayoutType): IWorkItemFormContext {
        return {
            workItemType: props.workItemType,
            workItemTypeColor: props.workItemTypeColor,

            workItem: props.workItem,
            isDisabledView: props.isDisabledView,
            contributionManager: props.contributionManager,

            items: {},
            layoutType: layoutType,

            formViewId: props.id
        };
    }
}