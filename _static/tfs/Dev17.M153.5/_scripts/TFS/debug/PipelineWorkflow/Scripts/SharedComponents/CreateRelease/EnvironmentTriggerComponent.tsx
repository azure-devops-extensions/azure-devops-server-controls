/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import * as Store from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseStore";
import * as EnvironmentUtils from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentUtils";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { ComboBoxType } from "DistributedTaskControls/Components/ComboBox";
import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { FlatViewDropdown } from "DistributedTaskControls/Components/FlatViewDropdown";
import { FlatViewTable } from "DistributedTaskControls/Components/FlatViewTable";
import { IFlatViewTableRow, ContentType, IFlatViewCell, IFlatViewColumn, ICellIndex } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";
import { TooltipDelay, TooltipHost } from "VSSUI/Tooltip";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";

import { css } from "OfficeFabric/Utilities";

export interface IEnvironmentTriggerProps extends Store.IEnvironmentTriggerState, Base.IProps {
    onEnvironmentTriggerSelectionChange(environmentId: number, selectedTriggerKey: number): void;
}

export class EnvironmentTriggerComponent extends Base.Component<IEnvironmentTriggerProps, Base.IStateless> {
    constructor(props: IEnvironmentTriggerProps) {
        super(props);
    }

    public render(): JSX.Element {
        let className: string = this.props ? this.props.cssClass : "";
        let triggerItems: EnvironmentUtils.IEnvironmentTrigger[] = (this.props && this.props.environmentTriggers) ? this.props.environmentTriggers : [];
        let onEnvironmentTriggerSelectionChange = !!this.props ? this.props.onEnvironmentTriggerSelectionChange : undefined;

        return (
            <div className={css("deploy-trigger-data", className)}>
                <FlatViewTable
                    key="deployments-list-key"
                    cssClass="deployments-list"
                    isHeaderVisible={true}
                    ariaLabel={Resources.EnvironmentsDeploymentTriggerListAriaLabel}
                    headers={EnvironmentTriggerComponent._getHeaders()}
                    rows={EnvironmentTriggerComponent._getRows(triggerItems, onEnvironmentTriggerSelectionChange)}
                    onCellValueChanged={(value: string, newCellIndex: ICellIndex) => {
                    }} />
            </div>
        );
    }

    private static _getHeaders(): IFlatViewColumn[] {
        let headers: IFlatViewColumn[] = [];

        headers.push({
            key: EnvironmentTriggerComponent._environmentNameColumnKey,
            name: Resources.EnvironmentColumnHeaderLabel,
            isFixedColumn: true,
            minWidth: 186,
            maxWidth: 186
        });

        headers.push({
            key: EnvironmentTriggerComponent._triggerColumnKey,
            name: Resources.TriggerColumnHeaderLabel,
            isFixedColumn: true,
            headerClassName: "environment-trigger-column-header",
            minWidth: 300,
            maxWidth: 300
        });

        return headers;
    }

    private static _getRows(
        triggerItems: EnvironmentUtils.IEnvironmentTrigger[],
        onEnvironmentTriggerSelectionChange: (environmentId: number, selectedTriggerKey: number) => void): IFlatViewTableRow[] {

        const triggerEnvironmentClassName = "trigger-environment";
        let rows: IFlatViewTableRow[] = [];

        triggerItems = triggerItems || [];

        triggerItems.forEach((trigger: EnvironmentUtils.IEnvironmentTrigger): void => {
            let row: IFlatViewTableRow = { cells: {} };
            let options: string[] = EnvironmentTriggerComponent._getTriggerOptions(trigger.triggerOptions);
            let referenceId: string = `${trigger.environmentId}-tooltip-message-override`;
            let triggerEnvironmentName: string = trigger.environmentName || Utils_String.empty;
            let environmentCellStyle: React.CSSProperties = {
                width: trigger.hasWarning ? "calc(100% - 20px)" : "100%"
            };

            let content = (
                <div>
                    {
                        !!trigger.hasWarning &&
                        <div className="dialog-row-error">
                            <TooltipHost
                                directionalHint={DirectionalHint.bottomLeftEdge}
                                content={trigger.warningMessage}
                                delay={TooltipDelay.zero}
                                id={referenceId}>
                                <div
                                    data-is-focusable={true}
                                    aria-describedby={referenceId}
                                    className={trigger.hasWarning ? " bowtie-icon bowtie-status-warning-outline left" : undefined} />
                            </TooltipHost>
                        </div>
                    }
                    {
                        <div className="trigger-environment-content" style={environmentCellStyle}>
                            <TooltipIfOverflow tooltip={triggerEnvironmentName} targetElementClassName={triggerEnvironmentClassName} >
                                <div className={triggerEnvironmentClassName} > {triggerEnvironmentName}</div>
                            </TooltipIfOverflow>
                        </div>
                    }
                </div>
            );
            row.cells[EnvironmentTriggerComponent._environmentNameColumnKey] = {
                content: content,
                contentType: ContentType.JsxElement,
                cssClass: "trigger-environment-cell",
                isTextDisabled: true
            } as IFlatViewCell;

            let optionsDisabled = !trigger.triggerOptions || trigger.triggerOptions.length <= 1;
            let triggerContent: JSX.Element | string;
            if (optionsDisabled) {
                triggerContent = (!!trigger.triggerOptions && trigger.triggerOptions.length === 1) ? trigger.triggerOptions[0].text : Utils_String.empty;
            }
            else {
                triggerContent = (
                    <FlatViewDropdown
                        cssClass="deploy-trigger-options"
                        key={trigger.environmentName}
                        ariaLabel={Utils_String.localeFormat(Resources.DeploymentTriggerOptionAriaLabelText, trigger.environmentName)}
                        rowSelected={false}
                        type={ComboBoxType.Searchable}
                        conditions={options}
                        selectedCondition={EnvironmentTriggerComponent._getTriggerSelectedOptionText(trigger.triggerOptions, trigger.selectedTriggerKey)}
                        onValueChanged={(newSelectedOption: string): void => {
                            EnvironmentTriggerComponent._onTriggerOptionChange(onEnvironmentTriggerSelectionChange, trigger.environmentId, newSelectedOption, trigger.triggerOptions);
                        }
                        } />);
            }

            row.cells[EnvironmentTriggerComponent._triggerColumnKey] = {
                content: triggerContent,
                contentType: optionsDisabled ? ContentType.SimpleText : ContentType.JsxElement,
                isTextDisabled: optionsDisabled,
                cssClass: optionsDisabled ? "environment-trigger-option-disabled" : Utils_String.empty
            } as IFlatViewCell;

            rows.push(row);
        });

        return rows;
    }

    private static _getTriggerOptions(options: EnvironmentUtils.ITriggerOption[]): string[] {
        options = options || [];
        return options.map((option: EnvironmentUtils.ITriggerOption) => { return option.text; });
    }

    private static _getTriggerSelectedOptionText(options: EnvironmentUtils.ITriggerOption[], selectedOptionKey: number): string {
        options = options || [];
        let option = Utils_Array.first(options, (option: EnvironmentUtils.ITriggerOption) => { return option.key === selectedOptionKey; });
        return !!option ? option.text : Utils_String.empty;
    }

    private static _onTriggerOptionChange(
        onEnvironmentTriggerSelectionChange: (environmentId: number, selectedTriggerKey: number) => void,
        environmentId: number,
        newSelectedOption: string,
        options: EnvironmentUtils.ITriggerOption[]): void {

        if (onEnvironmentTriggerSelectionChange && options && options.length > 0) {
            let selectedOption = Utils_Array.first(options, (option: EnvironmentUtils.ITriggerOption): boolean => {
                return Utils_String.localeIgnoreCaseComparer(option.text, newSelectedOption) === 0;
            });

            if (selectedOption) {
                onEnvironmentTriggerSelectionChange(environmentId, Utils_Number.parseInvariant(selectedOption.key.toString()));
            }
        }
    }

    private static _environmentNameColumnKey: string = "environmentName";
    private static _triggerColumnKey: string = "trigger";
    private static _triggerWarningColumnKey: string = "warning";
}
