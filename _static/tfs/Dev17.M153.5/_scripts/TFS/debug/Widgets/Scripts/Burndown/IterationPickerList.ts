import "VSS/LoaderPlugins/Css!Widgets/Styles/IterationPicker";
import * as Q from "q";

import * as Controls from "VSS/Controls";
import * as DateUtils from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_UI from "VSS/Utils/UI";
import { TreeNode } from "VSS/Controls/TreeView";

import { IterationsQuery } from 'Analytics/Scripts/QueryCache/IterationsQuery';

import { SettingsField } from 'Dashboards/Scripts/SettingsField';
import { ErrorMessageControl } from "Dashboards/Scripts/ErrorMessageControl";

import { IterationPickerRowOptions, IterationPickerRow } from 'Widgets/Scripts/Burndown/IterationPickerRow';
import { TimePeriodConfiguration } from 'Widgets/Scripts/Burndown/BurndownSettings';
import { TimePeriodHelper } from 'Widgets/Scripts/Burndown/TimePeriodHelper';
import { Iteration } from "Analytics/Scripts/CommonClientTypes";
import { WidgetsCacheableQueryService } from 'Widgets/Scripts/DataServices/WidgetsCacheableQueryService';
import { StartDatePicker } from "Widgets/Scripts/Shared/TimePickers";

import { isCurrentIterationMacro } from "WorkItemTracking/Scripts/OM/WiqlOperators";

import { ProjectCollection } from 'Presentation/Scripts/TFS/TFS.OM.Common';

import * as WidgetResources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";


export interface IterationPickerListOptions {
    /** Existing values, if any, to populate the picker with */
    dropdownValue: TimePeriodConfiguration

    currentStartDate: StartDatePicker;

    /* Change handler */
    onChange: () => void;
}

export class IterationPickerList extends Controls.Control<IterationPickerListOptions> {
    private iterationPickerRows: IterationPickerRow[];
    private iterationsTree: TreeNode[];
    private allIterations: Iteration[];
    private timePeriodStartDate: Date;

    private _$iterationListContainer: JQuery;
    private _$maxIterationAddedMessage: JQuery;
    private _$addNewRowButton: JQuery;
    private _$noIterationsMessage: JQuery;

    private errorMessage: ErrorMessageControl;

    public static iterationPickerCssClass: string = "iteration-picker-list";
    public static errorMessageCssClass: string = "iteration-picker-error-message";
    public static maxIterationRows = 52;

    public initializeOptions(options?: IterationPickerListOptions) {
        super.initializeOptions($.extend({
            coreCssClass: IterationPickerList.iterationPickerCssClass
        }, options));
    }

    public initialize() {
        super.initialize();

        this.iterationPickerRows = [];

        const $container = this.getElement();

        // Create Iterations label
        SettingsField.createSettingsFieldForJQueryElement({
            labelText: WidgetResources.TimePeriod_IterationsHeader,
        }, this._$iterationListContainer, $container);

        this._$iterationListContainer = $("<div>").appendTo($container);

        this._$noIterationsMessage = $("<div>")
            .attr("role", "status")
            .addClass("no-iterations-message-container")
            .append($("<span>").addClass("bowtie-icon bowtie-status-info"))
            .append($("<span>").addClass("bowtie no-iterations-message"))
            .append(WidgetResources.IterationsPicker_NoIterationsMessage)
            .hide();

        // Add iteration button
        this._$addNewRowButton = $("<button>")
            .attr("role", "button")
            .attr("aria-label", WidgetResources.TimePeriod_IterationsAddLabel)
            .attr("id", "add-iteration")
            .append($("<span>").addClass("bowtie-icon bowtie-math-plus"))
            .append(WidgetResources.TimePeriod_IterationsAddLabel)
            .addClass("bowtie add-row-button")
            .attr('disabled', 'disabled')
            .on("click", () => {
                this.addIterationPickerRow();
            });

        this._$maxIterationAddedMessage = $("<div>")
            .attr("role", "status")
            .append($("<span>").addClass("bowtie-icon bowtie-status-info"))
            .addClass("bowtie max-rows-message")
            .append(WidgetResources.TimePeriod_MaxIterationsAdded);

        let errorMessageDiv = $("<div>").addClass(IterationPickerList.errorMessageCssClass);
        this.errorMessage = ErrorMessageControl.create(ErrorMessageControl, errorMessageDiv, { collapseOnHide: true });

        Utils_UI.accessible(this._$addNewRowButton);
        this.toggleAddIterationButton();

        $container.append(errorMessageDiv)
            .append(this._$noIterationsMessage)
            .append(this._$addNewRowButton)
            .append(this._$maxIterationAddedMessage);
    }

    public setContext(projects: string[], timePeriodStartDate: Date): IPromise<void> {
        let iterationsQuery = IterationsQuery.onProject(projects[0], "IterationSK,IterationName,StartDate,EndDate,IsEnded,IterationPath");
        let dataService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
        this.timePeriodStartDate = timePeriodStartDate;

        return dataService.getCacheableQueryResult<Iteration[]>(iterationsQuery).then((iterations) => {
            this.allIterations = iterations;

            /** Only including iterations in the iteration dropdown which end after the user's specified start date */
            let validIterations = TimePeriodHelper.getValidIterations(iterations, timePeriodStartDate);

            this.iterationsTree = this.buildIterationTreeData(validIterations);

            if (this.iterationsTree.length <= 0) {
                this._$noIterationsMessage.show();
            } else {
                this._$noIterationsMessage.hide();
            }

            let iterationIds = this._options.dropdownValue.samplingConfiguration.settings as string[];


            if (this.iterationPickerRows.length === 0) {
                if (iterationIds.length > 0) {
                    let iterationPath = null;

                    iterationIds.forEach(iterationId => {
                        for (var i = 0; i < validIterations.length; i++) {
                            if (iterationId === validIterations[i].IterationSK) {
                                iterationPath = validIterations[i].IterationPath;
                                break;
                            }
                        }

                        this.createIterationPicker(iterationPath);
                    });
                } else {
                    this.createIterationPicker();
                }
            } else if (this.iterationPickerRows.length > 0) {
                this.iterationPickerRows.forEach(row => {
                    row.setSource(this.iterationsTree);
                });
            }

            this.validate();

            this._$addNewRowButton
                .removeAttr('disabled');
        }, (err) => {
            return Q.reject(err);
        });
    }

    public getName(): string {
        return "IterationPickerList";
    }

    public getSettings(): string[] {
        let iterations: string[] = [];
        let selectedIterations: Iteration[] = [];

        //** Retrieving all selected iterations */
        this.iterationPickerRows.forEach(iterationPickerRow => {
            let iterationValue = iterationPickerRow.getSettings();
            selectedIterations.push(iterationValue);
        });

        if (selectedIterations && selectedIterations.length > 0) {
            this.orderSelectedIterations(selectedIterations);

            //** Saving only IterationSK's */
            selectedIterations.forEach(iterationPickerRow => {
                if (iterationPickerRow) {
                    iterations.push(iterationPickerRow.IterationSK);
                }
            })
        }

        return iterations;
    }

    public createIterationPicker(iterationPath: string = null): void {
        let iterationPickerOptions = {
            iterationPath: iterationPath,
            allIterations: this.allIterations,
            onChange: () => this._options.onChange(),
            onDelete: (picker: IterationPickerRow) => { this.onRowDelete(picker) },
            onIterationChange: () => { this.validate() }
        } as IterationPickerRowOptions;

        let iterationPickerRow = IterationPickerRow.create(
            IterationPickerRow,
            this._$iterationListContainer,
            iterationPickerOptions);

        iterationPickerRow.setSource(this.iterationsTree);
        this.iterationPickerRows.push(iterationPickerRow);
        this.toggleRowRemoveButton();
    }

    public validate(): string {
        let rowErrorMessage = null;

        if (!this.validateNoCurrentIterationMacro()) {
            rowErrorMessage = WidgetResources.TimePeriod_CurrentIterationNotSupported;
        } else if (this.allEmptyIterations()) {
            rowErrorMessage = WidgetResources.TimePeriod_SelectOneIteration;
        } else if (!this.validateExistingIterations()) {
            rowErrorMessage = WidgetResources.BurndownConfiguration_IterationValidationFailed;
        } else if (!this.validateNoEmptyOrInvalidIterations()) {
            rowErrorMessage = WidgetResources.TimePeriod_IterationsEmptyOrUnrecognized;
        } else if (!this.validateNoDuplicateIterations()) {
            rowErrorMessage = WidgetResources.TimePeriod_DuplicateIteration;
        }

        this.errorMessage.setErrorMessage(rowErrorMessage, false/*isTrustedHtml*/);
        return rowErrorMessage;
    }

    /** Validates whether all existing iterations are empty or unrecognized */
    private allEmptyIterations(): boolean {
        for (let i = 0; i < this.iterationPickerRows.length; i++) {
            let currentIterationRow = this.iterationPickerRows[i].getSettings();
            if (currentIterationRow !== null) {
                return false;
            }
        }
        return true;
    }

    private validateNoDuplicateIterations(): boolean {
        let seenIterations = <string>{};

        for (let i = 0; i < this.iterationPickerRows.length; i++) {
            let currentSelectedIteration: Iteration = this.iterationPickerRows[i].getSettings();

            if (currentSelectedIteration && currentSelectedIteration.IterationSK) {
                if (!seenIterations[currentSelectedIteration.IterationSK]) {
                    seenIterations[currentSelectedIteration.IterationSK] = currentSelectedIteration.IterationSK;
                } else {
                    return false;
                }
            }
        }
        return true;
    }

    /** Validates if there are any invalid or empty iterations */
    private validateNoEmptyOrInvalidIterations(): boolean {
        for (let i = 0; i < this.iterationPickerRows.length; i++) {
            let currentSelectedIteration: Iteration = this.iterationPickerRows[i].getSettings();

            if (!currentSelectedIteration) {
                return false;
            }
        }

        return true;
    }

    /**An invalid iteration returns no value, so we retrieve the text of the combo since a previously selected @CurrentIteration's value would return null */
    private validateNoCurrentIterationMacro(): boolean {
        for (let i = 0; i < this.iterationPickerRows.length; i++) {
            let selectedIterationPath = this.iterationPickerRows[i].getIterationPathName();
            if (selectedIterationPath && isCurrentIterationMacro(selectedIterationPath, false)) {
                return false;
            }
        }
        return true;
    }

    /** Checking if currently selected iterations are still valid after start date change. Returns false if invalid. */
    private validateExistingIterations(): boolean {
        let isValid: boolean = true;

        for (let i = 0; i < this.iterationPickerRows.length; i++) {
            let rowIteration = this.iterationPickerRows[i].getSettings();

            if (rowIteration) {
                if (!TimePeriodHelper.isValidIteration(rowIteration, this.timePeriodStartDate)) {
                    isValid = false;
                    break;
                }
            }
        }

        return isValid;
    }

    //** Ordering selected iterations by earliest end date*/
    private orderSelectedIterations(selectedIterations: Iteration[]) {
        if (selectedIterations.length > 0) {
            selectedIterations.sort(function (firstIteration, secondIteration) {
                if (firstIteration && secondIteration) {
                    let dateA = new Date(firstIteration.EndDateTimeOffset);
                    let dateB = new Date(secondIteration.EndDateTimeOffset);
                    return DateUtils.defaultComparer(dateA, dateB);
                }
            });
        }
    }

    private buildIterationTreeData(iterations: Iteration[]): TreeNode[] {
        let treeData = [];

        iterations.forEach(iteration => {

            let iterationPath = iteration.IterationPath;

            if (iterationPath) {
                /* Split an iteration path into an array of nodes by using '//' as delimiter */
                let iterationNodes: string[] = iterationPath.split('\\');

                /* Initialize root node */
                let currentNodes = treeData;

                iterationNodes.forEach(iterationNode => {
                    let alreadyExists = false;

                    // Check if node already exists. If so, set currentNodes to its children
                    for (let i = 0; i < currentNodes.length; i++) {
                        if (currentNodes[i].name === iterationNode) {
                            alreadyExists = true;
                            currentNodes = currentNodes[i].children;
                            break;
                        }
                    }

                    if (!alreadyExists) {
                        let newNode = {
                            name: iterationNode,
                            children: []
                        };

                        currentNodes.push(newNode);
                        currentNodes = newNode.children;
                    }
                });
            }
        });

        // Generate tree from parsed data
        return treeData.map(treeNode => {
            return this.generateTreeNode(treeNode, null);
        });
    }

    /* Generates a tree node given a node and its parent */
    private generateTreeNode(node: any, parentNode: any): TreeNode {
        let currentNode;

        if (parentNode) {
            // Create a new node for the given node i.e. child
            currentNode = TreeNode.create(node.name);

            // Add new child node to parent node.
            parentNode.add(currentNode);

            // Set parent to newly added child.
            parent = currentNode;
        }
        else {
            currentNode = TreeNode.create(node.name);
        }

        if (node.children) {
            // Recursively generate tree nodes for children of the current node.
            node.children.map(child => {
                this.generateTreeNode(child, currentNode);
            });
        }

        return currentNode;
    }

    private addIterationPickerRow() {
        this.createIterationPicker();
        this.toggleAddIterationButton();
        this.validate();
        this.setFocusOnIterationChanges();
        this._options.onChange();
    }

    private setFocusOnIterationChanges() {
        if (this.iterationPickerRows.length > 0) {
            $(".iteration-picker-control .wrap input[type='text']").focus();
        } else {
            this._$addNewRowButton.focus();
        }
    }

    private toggleAddIterationButton() {
        let isIterationLimitReached = !(this.iterationPickerRows.length < IterationPickerList.maxIterationRows && this.iterationPickerRows.length >= 0);
        this._$maxIterationAddedMessage.toggle(isIterationLimitReached);
        this._$addNewRowButton.toggle(!isIterationLimitReached);
    }

    private onRowDelete(picker: IterationPickerRow) {
        let rowIndex = this.iterationPickerRows.indexOf(picker);
        if (this.iterationPickerRows.length > 1 && rowIndex >= 0) {
            this.iterationPickerRows[rowIndex].dispose();
            this.iterationPickerRows.splice(rowIndex, 1);
            this.toggleAddIterationButton();
            this.toggleRowRemoveButton();
            this.validate();
            this._options.onChange();
        }
    }

    private toggleRowRemoveButton() {
        if (this.iterationPickerRows.length !== 1) {
            for (let i = 0; i < this.iterationPickerRows.length; i++) {
                this.iterationPickerRows[i].$removeRowButton.removeClass("iteration-picker-delete-disabled");
            }
        } else {
            this.iterationPickerRows[0].$removeRowButton.addClass("iteration-picker-delete-disabled");
        }
    }
}