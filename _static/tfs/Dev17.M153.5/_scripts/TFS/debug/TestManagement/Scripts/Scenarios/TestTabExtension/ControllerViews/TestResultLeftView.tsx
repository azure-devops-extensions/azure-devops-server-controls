/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/TestTabExtension/ControllerViews/TestResultLeftView";

import * as React from "react";
import {
    TestResultDetailsActionCreator,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/TestResultDetailsActionCreator";
import {
    TestResultsListViewActionCreator,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsListViewActionCreator";
import { TestResultsListToolbarActionCreator } from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsListToolbarActionCreator";
import { TestResultsGridActionsHub } from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsGridActionsHub";
import TestResultsGrid = require("TestManagement/Scripts/Scenarios/TestTabExtension/Components/TestResultsGrid");
import {
    TestResultsListToolbar,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/ControllerViews/TestResultsListToolbar";
import { TestResultsStore } from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/TestResultsGridTreeStore";
import {
    TestResultsListCommandBarStore,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/TestResultsListCommandBarStore";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as ComponentBase from "VSS/Flux/Component";


export interface ITestResultLeftViewProps extends ComponentBase.Props {
    testResultsListActionHub: TestResultsGridActionsHub;
    testResultsListViewActionCreator: TestResultsListViewActionCreator;
    testResultDetailsActionCreator: TestResultDetailsActionCreator;
    treeStore: TestResultsStore;
    testResultsToolbarActionCreator: TestResultsListToolbarActionCreator;
    commandBarStore: TestResultsListCommandBarStore;
    context: Common.IViewContextData;
    element: HTMLElement;
}

export class TestResultLeftView extends ComponentBase.Component<ITestResultLeftViewProps, ComponentBase.State> {

    public render(): JSX.Element {

        return (
            <div className="test-results-left-view">
                <TestResultsListToolbar
                    testResultsListViewActionCreator={this.props.testResultsListViewActionCreator}
                    testResultsToolbarActionCreator={this.props.testResultsToolbarActionCreator}
                    treeStore={this.props.treeStore}
                    commandBarStore={this.props.commandBarStore}
                    context={this.props.context}
                />
                <div className="toolbar-grid-separator"></div>
                <div className="test-results-grid-view" data-is-scrollable={true}>
                    <TestResultsGrid.TestResultsList {...this.props} />
                </div>
            </div>
        );
    }
}
