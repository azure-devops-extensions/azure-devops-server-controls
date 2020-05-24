import React = require("react");
import * as TFS_React from "Presentation/Scripts/TFS/TFS.React";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import TMOM = require("TestManagement/Scripts/TFS.TestManagement");
import { IHostArtifact } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import * as LinkRendering from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/LinkRendering";
import { LinkChange, IFieldChange, ILinkChanges, IAttachmentChanges } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";
import HistoryModel = require("TestManagement/Scripts/TestStepHistory/TFS.TestManagement.TestStepHistoryModel");

let valueCompareRegex = /<DIV>|<P>|&nbsp;|<\/DIV>|<\/P>/ig;

export class TestStepHistoryUtils {

    public static getTestStepChanges(props: HistoryModel.ITestStepHistoryProps): HistoryModel.ITestStepChange[] {

        let fieldChange = props.fieldChange;
        let newSteps: TMOM.TestStep[] = [];
        let oldSteps: TMOM.TestStep[] = [];
        const testStepsTag = "steps";

        let stepsXml = $(Utils_Core.parseXml(fieldChange.rawNewValue || "")).find(testStepsTag);
        if (stepsXml.length > 0) {
            newSteps = TMOM.TestBase.parseTestSteps(stepsXml);
        }
        stepsXml = $(Utils_Core.parseXml(fieldChange.rawOldValue || "")).find(testStepsTag);
        if (stepsXml.length > 0) {
            oldSteps = TMOM.TestBase.parseTestSteps(stepsXml);
        }
        let newStepsIdMap: IDictionaryNumberTo<HistoryModel.ITestStepMetaData> = {};
        let oldStepsIdMap: IDictionaryNumberTo<HistoryModel.ITestStepMetaData> = {};
        this._generateTestStepsIdMap(newSteps, newStepsIdMap);
        this._generateTestStepsIdMap(oldSteps, oldStepsIdMap);

        // we are using 2 approaches here
        // approach1 : if steps added or deleted or modified then return those changes only (not consider reordering here)
        // approach2 : if approach1 return empty array then find changes for reordering of test steps
        let testStepChanges = this.addOrDeleteOrModifyTestSteps(newSteps, oldSteps, newStepsIdMap, oldStepsIdMap, props);
        if (testStepChanges.length === 0) {
            testStepChanges = this.reorderTestSteps(newSteps, oldSteps, newStepsIdMap, oldStepsIdMap, props);
        }

        return testStepChanges;
    }

    public static addOrDeleteOrModifyTestSteps(newSteps: TMOM.TestStep[],
        oldSteps: TMOM.TestStep[],
        newStepsIdMap: IDictionaryNumberTo<HistoryModel.ITestStepMetaData>,
        oldStepsIdMap: IDictionaryNumberTo<HistoryModel.ITestStepMetaData>,
        props: HistoryModel.ITestStepHistoryProps): HistoryModel.ITestStepChange[] {

        let testStepChanges: HistoryModel.ITestStepChange[] = [];

        // find out if new step modified or added
        newSteps.forEach((newStep) => {
            let testStepChange: HistoryModel.ITestStepChange;
            if (oldStepsIdMap[newStep.id]) {
                if (!this.compareTestSteps(newStepsIdMap[newStep.id], oldStepsIdMap[newStep.id])) {
                    testStepChange = {
                        type: HistoryModel.ITestStepChangeType.Edited,
                        newValue: this.updateTestStepWithProps(newStepsIdMap[newStep.id], props),
                        oldValue: this.updateTestStepWithProps(oldStepsIdMap[newStep.id], props)
                    };

                    this._updateTestStepChange(testStepChange);
                }
            }
            else {
                testStepChange = {
                    type: HistoryModel.ITestStepChangeType.Added,
                    newValue: this.updateTestStepWithProps(newStepsIdMap[newStep.id], props)
                };
            }

            if (testStepChange) {
                testStepChanges.push(testStepChange);
            }
        });

        // find out if step deleted
        oldSteps.forEach((oldStep) => {
            let testStepChange: HistoryModel.ITestStepChange;
            if (!newStepsIdMap[oldStep.id]) {
                testStepChange = {
                    type: HistoryModel.ITestStepChangeType.Deleted,
                    oldValue: this.updateTestStepWithProps(oldStepsIdMap[oldStep.id], props)
                };
            }

            if (testStepChange) {
                testStepChanges.push(testStepChange);
            }
        });

        return testStepChanges;
    }

    public static reorderTestSteps(newSteps: TMOM.TestStep[],
        oldSteps: TMOM.TestStep[],
        newStepsIdMap: IDictionaryNumberTo<HistoryModel.ITestStepMetaData>,
        oldStepsIdMap: IDictionaryNumberTo<HistoryModel.ITestStepMetaData>,
        props: HistoryModel.ITestStepHistoryProps): HistoryModel.ITestStepChange[] {

        let testStepChanges: HistoryModel.ITestStepChange[] = [];

        // steps are reorderd only
        newSteps.forEach((newStep, index) => {
            let testStepChange: HistoryModel.ITestStepChange;
            if (newStep.id !== oldSteps[index].id) {
                testStepChange = {
                    type: HistoryModel.ITestStepChangeType.Edited,
                    newValue: this.updateTestStepWithProps(newStepsIdMap[newStep.id], props),
                    oldValue: this.updateTestStepWithProps(oldStepsIdMap[newStep.id], props)
                };

                this._updateTestStepChange(testStepChange);
            }

            if (testStepChange) {
                testStepChanges.push(testStepChange);
            }
        });

        return testStepChanges;
    }

    public static updateTestStepWithProps(step: HistoryModel.ITestStepMetaData, props: HistoryModel.ITestStepHistoryProps): HistoryModel.ITestStepMetaData {
        let attachmentChanges = props.attachmentChanges;
        let linkChanges = props.linkChanges;
        let hostArtifact = props.hostArtifact;

        if (step.type === HistoryModel.TestStepActionType.SharedSteps) {
            let relationLinks = this.getRelationLinks(hostArtifact, linkChanges);
            step.action = this.getSharedStepsLink(relationLinks, step.action);
        }

        attachmentChanges.attachmentAdds.forEach((value: any, index: number) => {
            if (value.comment === Utils_String.format("[TestStep={0}]:", step.id)) {
                let name = value.linkData.OriginalName;
                let element = (
                    <div key={value.linkData.FilePath} className="history-attachment">
                        <ins>
                            <a className="attachment-text attachment-add" title={name}
                                onClick = { value.open.bind(value) }>{name}</a>
                        </ins>
                    </div>
                );
                step.attachments.added.push(element);
            }
        });

        attachmentChanges.attachmentDeletes.forEach((value: any, index: number) => {
            if (value.comment === Utils_String.format("[TestStep={0}]:", step.id)) {
                let name = value.linkData.OriginalName;
                let element = (
                    <div key={value.linkData.FilePath} className="history-attachment">
                        <del>
                            <a className="attachment-text attachment-delete" title={name}
                                onClick = { value.open.bind(value) }>{name}</a>
                        </del>
                    </div>
                );
                step.attachments.deleted.push(element);
            }
        });

        return step;
    }

    // return true if both are same and false otherwise
    public static compareTestSteps(step1: HistoryModel.ITestStepMetaData, step2: HistoryModel.ITestStepMetaData): boolean {       
        return step1.type === step2.type
            && this._compareRegexStrings(step1.action.toString(), step2.action.toString())
            && this._compareRegexStrings(step1.expectedResult.toString(), step2.expectedResult.toString());
    }

    public static getRelationLinks(hostArtifact: IHostArtifact, linkChanges: ILinkChanges): HistoryModel.IRelationLinks {
        let relationLinkAdditions: JSX.Element[] = [];
        let relationLinkDeletions: JSX.Element[] = [];

        this.createLinkChangeComponents(hostArtifact, linkChanges.relationLinkAdds, relationLinkAdditions);
        this.createLinkChangeComponents(hostArtifact, linkChanges.relationLinkDeletes, relationLinkDeletions);

        let relationLinks: HistoryModel.IRelationLinks = {
            added: relationLinkAdditions,
            deleted: relationLinkDeletions
        };

        return relationLinks;
    }

    public static createLinkChangeComponents(hostArtifact, linkChanges, elements) {
        if (!linkChanges || linkChanges.length === 0) {
            return;
        }

        linkChanges.forEach((change, index) => {
            elements.push(
                <LinkRendering.ArtifactLinkComponent
                    hostArtifact={hostArtifact}
                    linkChange={change}
                    key={index}/>);
        });
    }

    public static getSharedStepsLink(relationLinks: HistoryModel.IRelationLinks, id: number): JSX.Element {
        let links: JSX.Element[] = relationLinks.added.concat(relationLinks.deleted);
        
        let element = Utils_Array.first(links, (link: JSX.Element) => {
            return link.props.linkChange.resolvedLink.artifactLink.id === id.toString();
        });
        if (!element) {
            return <div />;
        }
        return element;
    }

    // update action and expected result if there is no change
    private static _updateTestStepChange(testStepChange: HistoryModel.ITestStepChange): void {

        if (this._compareRegexStrings(testStepChange.newValue.action.toString(), testStepChange.oldValue.action.toString())) {
            testStepChange.newValue.action = Utils_String.empty;
            testStepChange.oldValue.action = Utils_String.empty;
        }

        if (this._compareRegexStrings(testStepChange.newValue.expectedResult.toString(), testStepChange.oldValue.expectedResult.toString())) {
            testStepChange.newValue.expectedResult = Utils_String.empty;
            testStepChange.oldValue.expectedResult = Utils_String.empty;
        }
    }

    // return true if strings are same after applying regex parsing
    private static _compareRegexStrings(string1: string, string2: string): boolean {
        return string1.replace(valueCompareRegex, Utils_String.empty) === string2.replace(valueCompareRegex, Utils_String.empty);
    }

    private static _generateTestStepsIdMap(steps: any, idMap: IDictionaryNumberTo<HistoryModel.ITestStepMetaData>): void {
        steps.forEach((step, index) => {
            let action = "",
                expectedResult = "";

            switch (step.actionType) {
                case HistoryModel.TestStepActionType.SharedSteps:
                    action = step.ref;
                    break;
                case HistoryModel.TestStepActionType.Step:
                    action = step.action;
                    expectedResult = step.expectedResult;
                    break;
            }

            idMap[step.id] = {
                id: step.id,
                action: action,
                expectedResult: expectedResult,
                type: step.actionType,
                attachments: {
                    added: [],
                    deleted: []
                },
                stepNumber: index + 1
            };
        });
    }
}