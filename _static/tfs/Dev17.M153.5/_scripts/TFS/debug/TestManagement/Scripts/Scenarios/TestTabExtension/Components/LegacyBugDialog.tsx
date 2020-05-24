/// <reference types="react" />
import * as React from "react";
import { ITestResultTreeData } from "TestManagement/Scripts/Scenarios/Common/Common";
import { IViewContextData } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { AddWorkItemHelper, AddBugAndWorkItem } from "TestManagement/Scripts/Scenarios/TestTabExtension/Helpers/AddWorkItemHelper";
import LWP = require("VSS/LWP");

export interface ILegacyBugDialogProps {
    dialogType: string;
    results: ITestResultTreeData[];
    viewContext: IViewContextData;
}

export class LegacyBugDialog extends React.Component<ILegacyBugDialogProps, {}> {

    
    constructor(props: ILegacyBugDialogProps) {
        super(props);
    }

    public render(): null {

        let workItemHelper: AddWorkItemHelper = new AddWorkItemHelper(this.props.viewContext);
        if (this.props.results && this.props.results.length > 0) {

            if (this.props.dialogType === AddBugAndWorkItem.Create_Bug) {
               workItemHelper.openCreateBugWindow(this.props.results);
            }
            else if (this.props.dialogType === AddBugAndWorkItem.Add_To_Existing_Bug) {
                workItemHelper.openAddToExistingBugWindow(this.props.results);

            }
            else if (this.props.dialogType === AddBugAndWorkItem.Add_Associated_WorkItem) {
                workItemHelper.onAssociateWorkItemClick(this.props.results);
            }
        }
        return null;
    }
}


LWP.registerLWPComponent("legacyBugDialog", LegacyBugDialog);