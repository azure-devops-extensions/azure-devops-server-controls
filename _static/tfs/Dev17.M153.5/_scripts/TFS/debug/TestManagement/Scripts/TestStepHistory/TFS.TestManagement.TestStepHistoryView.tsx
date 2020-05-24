/// <amd-dependency path='VSS/LoaderPlugins/Css!Site' />
/// <amd-dependency path='VSS/LoaderPlugins/Css!TestManagement' />

import React = require("react");
import ReactDOM = require("react-dom");
import * as TFS_React from "Presentation/Scripts/TFS/TFS.React";
import VSS = require("VSS/VSS");
import * as SDK from "VSS/SDK/Shim";
import * as Controls from "VSS/Controls";
import * as Utils_String from "VSS/Utils/String";

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import { IColumn, ConstrainMode, CheckboxVisibility } from "OfficeFabric/components/DetailsList/DetailsList.types";
import { DetailsList } from "OfficeFabric/components/DetailsList/DetailsList";
import { DetailsRow, IDetailsRowProps } from "OfficeFabric/components/DetailsList/DetailsRow";
import * as HistoryUtils from "TestManagement/Scripts/TestStepHistory/TFS.TestManagement.TestStepHistoryUtils";
import HistoryModel = require("TestManagement/Scripts/TestStepHistory/TFS.TestManagement.TestStepHistoryModel");

export class TestStepHistoryView extends React.Component<HistoryModel.ITestStepHistoryProps, TFS_React.IState> {

    public render(): JSX.Element {

        return (
            <div key={this.props.fieldChange.name} className="test-step-history-view">
                <div>
                    <div className="field-name">{this.props.fieldChange.name}</div>
                </div>
                <div className="field-details">
                    {
                        (<DetailsList
                            checkboxVisibility = { CheckboxVisibility.hidden }
                            className = "field-details-list"
                            items = { this._getItems() }
                            columns = { this._getColumns() }
                            onRenderItemColumn = { this._renderColumns }
                            onRenderRow = { this._onRenderRow }
                            setKey = "key"
                            />)
                    }
                </div>
            </div>
        );
    }

    private _onRenderRow = (props: IDetailsRowProps) => {
        let rowClassName: string = "";
        if (props.item && props.item[0] && props.item[0].props && props.item[0].props.children) {
            let value = props.item[0].props.children;
            if (value.indexOf(HistoryModel.TestStepChangeType.AddedStep) >= 0) {
                rowClassName = "added-value-row";
            } else if (value.indexOf(HistoryModel.TestStepChangeType.UpdatedStep) >= 0) {
                rowClassName = "updated-value-row";
            } else if (value.indexOf(HistoryModel.TestStepChangeType.DeletedStep) >= 0) {
                rowClassName = "deleted-value-row";
            } else if (value.indexOf(HistoryModel.TestStepChangeType.PreviousStep) >= 0) {
                rowClassName = "previous-value-row";
            }
        }
        return (
            <div className={"row-view " + rowClassName} >
                <DetailsRow {...props}/>
            </div>
        );
    }

    private _renderColumns(item: string[], index: number, column: IColumn): string {

        let renderItem: string = Utils_String.empty;
        switch (column.key) {
            case TestStepHistoryView._index:
                renderItem = item[0];
                break;
            case TestStepHistoryView._action:
                renderItem = item[1];
                break;
            case TestStepHistoryView._expectedResult:
                renderItem = item[2];
                break;
            case TestStepHistoryView._attachment:
                renderItem = item[3];
                break;
        }

        return renderItem;
    }

    private _getColumns(): IColumn[] {
        let columns: IColumn[] = [];

        columns.push({ key: TestStepHistoryView._index, name: null, fieldName: null, isResizable: true, minWidth: 100, maxWidth: 120 });
        columns.push({ key: TestStepHistoryView._action, name: Resources.TestStepHistoryGridHeader_Action, fieldName: null, isResizable: true, minWidth: 200, maxWidth: 300 });
        columns.push({ key: TestStepHistoryView._expectedResult, name: Resources.TestStepHistoryGridHeader_ExpectedResult, fieldName: null, isResizable: true, minWidth: 200, maxWidth: 300 });
        columns.push({ key: TestStepHistoryView._attachment, name: Resources.String1TestStepHistoryGridHeader_Attachment, fieldName: null, isResizable: true, minWidth: 150, maxWidth: 200 });

        return columns;
    }

    private _getItems(): any[] {
        let itemsToRender: any[] = [];
        let testStepChanges: HistoryModel.ITestStepChange[] = HistoryUtils.TestStepHistoryUtils.getTestStepChanges(this.props);
        testStepChanges.forEach((testStepChange) => {
            let newItem: (string | JSX.Element)[] = [];
            let oldItem: (string | JSX.Element)[] = [];
            let stepValue: string;
            if (testStepChange.type === HistoryModel.ITestStepChangeType.Added || testStepChange.type === HistoryModel.ITestStepChangeType.Edited) {
                if (testStepChange.type === HistoryModel.ITestStepChangeType.Added) {
                    stepValue = Utils_String.format("{0} {1}", HistoryModel.TestStepChangeType.AddedStep, testStepChange.newValue.stepNumber);
                } else {
                    stepValue = Utils_String.format("{0} {1}", HistoryModel.TestStepChangeType.UpdatedStep, testStepChange.newValue.stepNumber);
                }

                newItem.push(<div className="step-value">
                                {stepValue}
                            </div>);

                newItem.push(<div className="action-value">
                    { testStepChange.newValue.type === HistoryModel.TestStepActionType.SharedSteps &&
                        <div className="test-step-new-value-container">
                            {testStepChange.newValue.action}
                        </div>
                    }
                    { testStepChange.newValue.type === HistoryModel.TestStepActionType.Step &&
                        <div className="test-step-new-value-container">
                            <ins>
                                <span className="test-step-value new-value" dangerouslySetInnerHTML={{ __html: testStepChange.newValue.action }} ></span>
                            </ins>
                        </div>
                    }
                </div>);

                newItem.push(<div className="expected-result-value">
                    <div className="test-step-new-value-container">
                        <ins>
                            <span className="test-step-value new-value" dangerouslySetInnerHTML={{ __html: testStepChange.newValue.expectedResult }} ></span>
                        </ins>
                    </div>
                </div>);

                newItem.push(<div className = "attachment-added">
                    {testStepChange.newValue.attachments.added}
                </div>);
            }

            if (testStepChange.type === HistoryModel.ITestStepChangeType.Deleted || testStepChange.type === HistoryModel.ITestStepChangeType.Edited) {

                if (testStepChange.type === HistoryModel.ITestStepChangeType.Deleted) {
                    stepValue = Utils_String.format("{0} {1}", HistoryModel.TestStepChangeType.DeletedStep, testStepChange.oldValue.stepNumber);
                } else {
                    stepValue = Utils_String.format("{0} {1}", HistoryModel.TestStepChangeType.PreviousStep, testStepChange.oldValue.stepNumber);
                }

                oldItem.push(<div className="step-value">
                                {stepValue}
                            </div>);

                oldItem.push(<div className="action-value">
                    { testStepChange.oldValue.type === HistoryModel.TestStepActionType.SharedSteps &&
                        <div className="test-step-old-value-container">
                        {testStepChange.oldValue.action}
                        </div>
                    }
                    { testStepChange.oldValue.type === HistoryModel.TestStepActionType.Step &&
                        <div className="test-step-old-value-container">
                            <ins>
                            <span className="test-step-value old-value" dangerouslySetInnerHTML={{ __html: testStepChange.oldValue.action }} ></span>
                            </ins>
                        </div>
                    }
                </div>);

                oldItem.push(<div className="expected-result-value">
                    <div className="test-step-old-value-container">
                        <ins>
                            <span className="test-step-value old-value" dangerouslySetInnerHTML={{ __html: testStepChange.oldValue.expectedResult }} ></span>
                        </ins>
                    </div>
                </div>);

                oldItem.push(<div className = "attachment-deleted">
                    {testStepChange.oldValue.attachments.deleted}
                </div>);
            }

            if (newItem.length > 0) {
                itemsToRender.push(newItem);
            }
            if (oldItem.length > 0) {
                itemsToRender.push(oldItem);
            }

        });

        return itemsToRender;
    }

    private _detailsList: DetailsList;

    private static _index: string = "Index";
    private static _action: string = "Action";
    private static _expectedResult: string = "Expected result";
    private static _attachment: string = "Attachment";
}

// Registering "teststep.history"
SDK.registerContent("teststep.history", (context) => {

    let options = context.options;
    let $container = context.$container;

    let element: JSX.Element = (
        <TestStepHistoryView fieldChange={options.fieldChange} attachmentChanges={options.attachmentChanges} linkChanges={options.linkChanges} hostArtifact={options.hostArtifact}/>
    );

    ReactDOM.render(element, $container[0]);
});