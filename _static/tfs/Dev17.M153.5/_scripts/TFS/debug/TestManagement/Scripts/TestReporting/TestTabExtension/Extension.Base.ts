/// <amd-dependency path='VSS/LoaderPlugins/Css!Site' />
/// <amd-dependency path='VSS/LoaderPlugins/Css!TestManagement' />

import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as ViewModel from "TestManagement/Scripts/TestReporting/TestTabExtension/ViewModel";

import { TestTabView, SummaryView } from "TestManagement/Scripts/TestReporting/TestTabExtension/Extension.Views";
import * as DataProviderCommon from "TestManagement/Scripts/TestReporting/DataProviders/Common";

import * as Controls from "VSS/Controls";
import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

/// <summary>
/// Interface for Test Results extensions viewContext handlers
/// </summary>
export interface IViewContextHandler {
    sourceCallback(data: any): void;
    onDisplayedCallBack(): void;
}

/// <summary>
/// Interface for Test Results extension contributions
/// </summary>
export interface ITestResultsContribution {
    createView(): void;
    getView(): TestTabView | SummaryView;
    getViewContext(): CommonBase.ViewContext;
    getViewContextHandler(): IViewContextHandler;
}

/// <summary>
/// Interface for contributionBase options
/// </summary>
export interface IContributionBaseOptions {
    name: string;
}

/// <summary>
/// Base class for Test Results extensions
/// </summary>
export class TestResultsContributionBase<T extends IContributionBaseOptions> extends Controls.Control<T> {

    public initialize(): void {
        super.initialize();
        this._viewModel = new ViewModel.ResultsViewModel();
    }

    protected getView(): TestTabView | SummaryView {
        throw new Error("getView method should be defined in derived class");
    }

    public getViewContext(): CommonBase.ViewContext {
        throw new Error("getViewContext method should be defined in derived class");
    }

    public getViewContextHandler(): IViewContextHandler {
        throw new Error("getViewContextHandler method should be defined in derived class");
    }

    protected _viewModel: ViewModel.ResultsViewModel;
    protected _viewContextHandler: IViewContextHandler;
    protected _viewContext: CommonBase.ViewContext;
    protected _dataProvider: DataProviderCommon.IDataProvider;
}
