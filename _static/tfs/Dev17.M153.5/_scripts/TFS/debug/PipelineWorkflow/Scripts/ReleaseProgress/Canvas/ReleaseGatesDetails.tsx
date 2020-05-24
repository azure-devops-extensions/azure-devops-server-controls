import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { DialogWithMultiLineTextInput } from "DistributedTaskControls/Components/DialogWithMultiLineTextInput";

import {
    IReleaseGateInfo,
    IReleaseGateResultInstance,
    ReleaseGateEvaluationResult
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentGatesTypes";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleaseGatesSample } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesSample";
import { DateTimeUtils } from "PipelineWorkflow/Scripts/Shared/Utils/DateTimeUtils";

import { localeFormat, empty } from "VSS/Utils/String";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { VssDetailsList } from "VSSUI/Components/VssDetailsList/VssDetailsList";
import * as Utils_String from "VSS/Utils/String";

import { css } from "OfficeFabric/Utilities";
import { CheckboxVisibility, ColumnActionsMode, ConstrainMode, IColumn, IDetailsRowProps, DetailsRow, DetailsListLayoutMode } from "OfficeFabric/DetailsList";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Image, ImageFit } from "OfficeFabric/Image";
import { TooltipHost } from "VSSUI/Tooltip";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesDetails";

export interface IReleaseGatesDetailsProps extends IProps {
    gatesInfoList: IReleaseGateInfo[];
    gatesEvaluationTimestamps: Date[];
    gatesSampleRanks: number[];
    showSamples: boolean;
    highlightLatestSample: boolean;
    showNextSampleTime: boolean;
    nextSampleTimestampText?: string;
    nextSampleTimestampTooltip?: string;
    environmentId: number;
    showGateActions: boolean;
    onGateIgnore?: (name: string, comment: string) => void;
    onClickGateResult?: (gateName: string, sampleRank: number) => void;
    isPreDeploymentGates: boolean;
}

export interface IReleaseGatesDetailsState extends Base.IState {
    ignoredGateName: string;
    showDialog: boolean;
}

export namespace GatesColumnKeys {
    export const name: string = "Name";
    export const sample: string = "Sample";
}

export class ReleaseGatesDetails extends Component<IReleaseGatesDetailsProps, IReleaseGatesDetailsState> {

    constructor(props: IReleaseGatesDetailsProps) {
        super(props);
        this.state = this._getInitialState();
    }

    public render(): JSX.Element {

        if (this.props.gatesInfoList && this.props.gatesInfoList.length > 0) {
            return (
                <div className="gates-details">
                    { this._getGatesResult()}
                    {
                        this.state.showDialog &&
                        <DialogWithMultiLineTextInput
                            okButtonText={Resources.Yes}
                            okButtonAriaLabel={Resources.Yes}
                            cancelButtonAriaLabel={Resources.No}
                            cancelButtonText={Resources.No}
                            titleText={Resources.IgnoreGateHeading}
                            multiLineInputLabel={Resources.Comment}
                            showDialog={this.state.showDialog}
                            onOkButtonClick={(text: string) => { this._onIgnoreGate(text); }}
                            onCancelButtonClick={this._hideIgnoreGateDialog}
                            subText={this._getIgnoreGateDialogDescription()}
                        >
                        </DialogWithMultiLineTextInput>
                    }
                </div>
            );
        }
        else {
            return null;
        }
    }

    private _getGatesResult(): JSX.Element {
        return (
            <VssDetailsList
                ref={(detailsList) => { this._detailsList = detailsList; }}
                className={css("gates-details-list")}
                setKey={"gates-list"}
                isHeaderVisible={true}
                constrainMode={ConstrainMode.unconstrained}
                layoutMode={DetailsListLayoutMode.fixedColumns}
                compact={true}
                columns={this._getColumns()}
                items={this._getItems()}
                checkboxVisibility={CheckboxVisibility.hidden}
                shouldDisplayActions={this._shouldDisplayActions}
                actionsColumnKey={GatesColumnKeys.name}
                onRenderItemColumn={this._onRenderItemColumn}
                getMenuItems={this.props.showGateActions ? this._getMenuItems : null} />
        );
    }

    private _getColumns(): IColumn[] {
        const columns: IColumn[] = [];
        let title: string = this.props.showSamples ? Resources.DeploymentGatesAndSamples : Resources.DeploymentGatesText;
        let nameColumn: IColumn = this._getColumn(GatesColumnKeys.name, title, 300, 400, this._getHeaderColumnClass("gate-name-column"));

        columns.push(nameColumn);

        if (this.props.showSamples) {

            let gateEvaluationsCount: number = this.props.gatesEvaluationTimestamps.length;
            let className: string = this._getHeaderColumnClass("gate-sample-time");
            let sampleIndex: number = 0;

            (this.props.gatesEvaluationTimestamps || []).forEach((gateEvaluationTimestamp: Date, index: number) => {

                let sampleTime: string = DateTimeUtils.getLocaleTimestamp(gateEvaluationTimestamp, DateTimeUtils.timeOnlyFormatOptions);
                let sampleTimeCssClass = css(className, (index === (gateEvaluationsCount - 1)) ? "bold" : "");
                let column: IColumn = this._getColumn(this._getSampleKey(sampleIndex), sampleTime, 70, 70, sampleTimeCssClass);

                columns.push(column);
                sampleIndex++;
            });

            if (this.props.showNextSampleTime) {
                let sampleTime = this.props.nextSampleTimestampText;
                let column: IColumn = this._getColumn(this._getSampleKey(sampleIndex), sampleTime, 70, 70, className);

                columns.push(column);
            }

        }

        return columns;
    }

    private _getColumn(key: string, name: string, minWidth: number, maxWidth: number, className: string): IColumn {
        return {
            key: key,
            name: name,
            fieldName: key,
            isResizable: false,
            minWidth: minWidth,
            maxWidth: maxWidth,
            headerClassName: className,
            columnActionsMode: ColumnActionsMode.disabled,
            ariaLabel: name
        };
    }

    private _getItems(): any[] {
        const itemsToRender: { [key: string]: string | JSX.Element }[] = [];
        let timestamps: string[] = this._getTimestamps();
        let maxGateResults: number = this._getMaxGateResults();

        (this.props.gatesInfoList || []).forEach((gateInfo: IReleaseGateInfo, gateIndex: number) => {
            const item: { [key: string]: string | JSX.Element } = {};

            item[GatesColumnKeys.name] = this._getGateNameContent(gateInfo);

            if (this.props.showSamples) {
                
                let indexOfGateResult: number = 0;

                // Push the gate results
                (gateInfo.evaluationResults || []).forEach((gateEvaluation: IReleaseGateResultInstance) => {
                    
                    item[this._getSampleKey(indexOfGateResult)] = this._getGateSample(gateIndex, gateInfo.name, maxGateResults, indexOfGateResult, gateEvaluation, timestamps);
                    indexOfGateResult++;
                });
                
                if (gateInfo.isIgnored) {
                    // Push empty sample views for ignored gate
                    for (; indexOfGateResult < maxGateResults; indexOfGateResult++) {
                        item[this._getSampleKey(indexOfGateResult)] = this._getIgnoredGateSample(maxGateResults, indexOfGateResult, gateIndex, gateInfo);
                    }
                }

                // If we're showing next sample, push an entry for that
                if (this.props.showNextSampleTime) {
                    item[this._getSampleKey(indexOfGateResult)] = this._getNextSample(gateIndex);
                }
            }

            itemsToRender.push(item);
        });

        return itemsToRender;
    }
    
    private _getTimestamps() {
        let timestamps: string[] = [];

        this.props.gatesEvaluationTimestamps.forEach((gateEvaluationTimestamp: Date) => {
            let sampleTime: string = DateTimeUtils.getLocaleTimestamp(gateEvaluationTimestamp, DateTimeUtils.timeOnlyFormatOptions);
            timestamps.push(sampleTime);
        });

        return timestamps;
    }

    private _getMaxGateResults(): number {

        let maxGateResults: number = 0;

        this.props.gatesInfoList.forEach((gateInfo: IReleaseGateInfo) => {
            if (gateInfo.evaluationResults && maxGateResults < gateInfo.evaluationResults.length) {
                maxGateResults = gateInfo.evaluationResults.length;
            }
        });

        return maxGateResults;
    }

    private _getGateNameContent(gateInfo: IReleaseGateInfo): JSX.Element {
        let gateTitleClassName: string = css("gate-name", gateInfo.description ? "" : "centered", gateInfo.isIgnored ? "gate-name-strike" : "");
        let gateIcon: JSX.Element = null;
        let gateDescription: JSX.Element = gateInfo.description ?
            <div className="gate-desc" title={gateInfo.description}>{gateInfo.description}</div> : null;

        if (gateInfo.iconUrl) {
            gateIcon = (<Image className="gate-image" src={gateInfo.iconUrl} imageFit={ImageFit.contain} alt={empty} />);
        }
        else {
            gateIcon = (<VssIcon className="gate-image default" iconName="toll" iconType={VssIconType.bowtie} />);
        }

        return (
            <div key={"gate-" + gateInfo.name} className="gate-name-column-content-cell">
                {gateIcon}
                <div className="gate-text">
                    <div className={gateTitleClassName}>{gateInfo.name}</div>
                    {gateDescription}
                </div>
            </div>
        );
    }

    private _getGateSample(gateIndex: number, gateName: string, maxGateResults: number, gateEvaluationIndex: number, gateEvaluation: IReleaseGateResultInstance, timestamps: string[]): JSX.Element {
        
        let ariaLabel: string = localeFormat(Resources.GateResultAriaLabel, gateName, gateEvaluation.result, timestamps[gateEvaluationIndex]);
        let gateResultIconName: string = this._getIconForGateEvaluationResult(gateEvaluation);
        let gateResultIconClass: string = css(this._resultIconContainerBaseClass, this._getIconClassForGateEvaluationResult(gateEvaluation.result));
        let sampleResultClass: string = this._getGateResultClass(maxGateResults, gateIndex, gateEvaluationIndex);

        return (
            <ReleaseGatesSample 
                environmentId={this.props.environmentId}
                gatesSampleRanks={this.props.gatesSampleRanks}
                isPreDeploymentGates={this.props.isPreDeploymentGates}
                gateName={gateName}
                gateEvaluationIndex={gateEvaluationIndex}
                ariaLabel={ariaLabel}
                gateResultIconName={gateResultIconName}
                gateResultIconClass={gateResultIconClass}
                resultIconBaseClass={this._resultIconBaseClass}
                onClickGateResult={this.props.onClickGateResult}
                sampleResultClass={sampleResultClass} />
        );
    }

    private _getIgnoredGateSample(maxGateResults: number, indexOfGateResult: number, gateIndex: number, gateInfo: IReleaseGateInfo): JSX.Element {
        
        let ignoreGateResultClass: string = this._getGateResultClass(maxGateResults, gateIndex, indexOfGateResult);
        const ignoredGateCss = css(this._resultIconContainerBaseClass, "gate-ignored");
        let ignoredGateAriaLabel = localeFormat("{0} {1}", gateInfo.name, gateInfo.description);

        return (
            <div key={"gateNextSample-" + indexOfGateResult + "-" + gateIndex} className={ignoreGateResultClass}>
                <div className={ignoredGateCss} aria-label={ignoredGateAriaLabel}>
                    <TooltipHost content={ignoredGateAriaLabel}>
                        <VssIcon className={this._resultIconBaseClass} iconName="StatusCircleRing" iconType={VssIconType.fabric} />
                    </TooltipHost>    
                </div>
            </div>
        );
    }

    private _getNextSample(gateIndex): JSX.Element {

        return (
            <div key={"gateNextSample-" + gateIndex} className="gate-sample-result next">
                <div className={this._resultIconContainerBaseClass}>
                    <VssIcon className={this._resultIconBaseClass} iconName="ProgressLoopOuter" iconType={VssIconType.fabric} />
                </div>
            </div>
        );
    }

    private _getGateResultClass(maxGateResults: number, gateIndex: number, gateEvaluationIndex: number): string {
        let gateResultClass: string = "gate-sample-result";

        if (this.props.highlightLatestSample) {
            let isLatestEvaluation = this._isLatestEvaluation(gateEvaluationIndex, maxGateResults);
            gateResultClass = css(gateResultClass, isLatestEvaluation ? "middle" : "");
            gateResultClass = css(gateResultClass, (isLatestEvaluation && this._isLastGate(gateIndex)) ? "bottom" : "");
        }

        return gateResultClass;
    }

    
    private _isLastGate(gateIndex: number): boolean {
        return gateIndex === (this.props.gatesInfoList.length - 1);

    }

    private _isLatestEvaluation(gateEvaluationIndex: number, maxGateResults: number): boolean {
        return gateEvaluationIndex === (maxGateResults - 1);
    }

    private _getSampleKey(index): string {
        return Utils_String.format("{0}_{1}", GatesColumnKeys.sample, index);
    }

    private _getMenuItems = (): IContextualMenuItem[] => {
        const selection = this._detailsList.state.selection;
        const selectedIndex = selection.getSelectedIndices()[0];
        const gateInfo = this.props.gatesInfoList[selectedIndex];

        const gateName = gateInfo.name;
        const menuItems: IContextualMenuItem[] = [];
        const expandViewMenuItem: IContextualMenuItem = {
            name: Resources.IgnoreGateViewButtonName,
            key: "IgnoreGate-" + gateName,
            data: { "gateName": gateName },
            ariaLabel: Resources.IgnoreGateViewButtonName,
            iconProps: { className: "bowtie-icon bowtie-arrow-open" },
            disabled: gateInfo.isIgnored || !this.props.showGateActions,
            className: "fabric-style-overrides commandBar-hover-override show-logs",
            onClick: this._onIgnoreGateClick
        };
        menuItems.push(expandViewMenuItem);

        return menuItems;
    }

    private _shouldDisplayActions = (): boolean => {
        return true;
    }
    
    private _onRenderItemColumn = (item: { [key: string]: string | JSX.Element }, index: number, column: IColumn): string | JSX.Element => {

        const renderItem: string | JSX.Element = (item.hasOwnProperty(column.fieldName) && item[column.fieldName]) || Utils_String.empty;
        return renderItem;
    }

    private _getHeaderColumnClass(className: string): string {
        const headerClass: string = "gates-details-list-header-column";

        return Utils_String.format("{0} {1}", headerClass, className);
    }

    private _onIgnoreGateClick = (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, item: IContextualMenuItem) => {
        this.setState({ ignoredGateName: item.data.gateName, showDialog: true });
    }

    private _getIconForGateEvaluationResult(evaluationResult: IReleaseGateResultInstance): string {
        let iconMapToUse: IDictionaryStringTo<string> = ReleaseGatesDetails._evaluationGateResultToIconMap;
        if (evaluationResult.isStabilizationResult) {
            iconMapToUse = ReleaseGatesDetails._stabilizationGateResultToiconMap;
        }

        return iconMapToUse[evaluationResult.result];
    }

    private _getIconClassForGateEvaluationResult(evaluationResult: ReleaseGateEvaluationResult): string {
        switch (evaluationResult) {
            case ReleaseGateEvaluationResult.Succeeded:
                return "succeeded";
            case ReleaseGateEvaluationResult.Failed:
                return "failed";
            // TODO: Add icons for inprogress, ignored etc. when those conditions are handled (Task #1212322)
            default:
                return "failed";

        }
    }

    private _getInitialState(): IReleaseGatesDetailsState {
        return { ignoredGateName: empty, showDialog: false };
    }

    private _getIgnoreGateDialogDescription = (): string => {
        return localeFormat(Resources.IgnoreGateDescription, this.state.ignoredGateName);
    }

    private _onIgnoreGate = (comment: string) => {
        if (this.props.onGateIgnore) {
            this.props.onGateIgnore(this.state.ignoredGateName, comment);
        }

        this._hideDialog();
    }

    private _hideIgnoreGateDialog = () => {
        this._hideDialog();
    }

    private _hideDialog(): void {
        this.setState(this._getInitialState());
    }

    private static readonly _evaluationGateResultToIconMap: IDictionaryStringTo<string> = ReleaseGatesDetails._initializeEvaluationGateResultToIconMap();
    private static readonly _stabilizationGateResultToiconMap: IDictionaryStringTo<string> = ReleaseGatesDetails._initializeStabilizationGateResultToIconMap();


    private static _initializeEvaluationGateResultToIconMap(): IDictionaryStringTo<string> {
        let map: IDictionaryStringTo<string> = {};
        map[ReleaseGateEvaluationResult.Succeeded] = "CompletedSolid";
        map[ReleaseGateEvaluationResult.Failed] = "StatusErrorFull";
        // TODO: Add icons for inprogress, ignored etc. when those conditions are handled (Task #1212322)
        map[ReleaseGateEvaluationResult.InProgress] = "StatusErrorFull";
        map[ReleaseGateEvaluationResult.Ignored] = "StatusErrorFull";

        return map;
    }

    private static _initializeStabilizationGateResultToIconMap(): IDictionaryStringTo<string> {
        let map: IDictionaryStringTo<string> = {};
        map[ReleaseGateEvaluationResult.Succeeded] = "Completed";
        map[ReleaseGateEvaluationResult.Failed] = "ErrorBadge";
        // TODO: Add icons for inprogress, ignored etc. when those conditions are handled (Task #1212322)
        map[ReleaseGateEvaluationResult.InProgress] = "ErrorBadge";
        map[ReleaseGateEvaluationResult.Ignored] = "ErrorBadge";

        return map;
    }

    private _detailsList: VssDetailsList;
    private  _resultIconContainerBaseClass: string = "result-icon-container";
    private _resultIconBaseClass: string = "result-icon";
}