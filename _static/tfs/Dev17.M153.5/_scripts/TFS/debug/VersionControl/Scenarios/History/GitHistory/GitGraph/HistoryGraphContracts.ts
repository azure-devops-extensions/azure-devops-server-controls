import { GitCommitRef } from "TFS/VersionControl/Contracts";
import { HighlightDirection } from "VersionControl/Scenarios/History/GitHistory/GitGraph/VisualizationContracts";
import {
    HistoryGraphOrientation,
    IHistoryGraphRenderSettings
} from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphRenderContracts";
import { VisualizationCell } from "VersionControl/Scenarios/History/GitHistory/GitGraph/VisualizationCell";

/**
 * Settings pertaining to the git history graph
 */
export interface IHistoryGraphSettings {
    orientation: HistoryGraphOrientation,
    excisionSettings: IHistoryGraphExcisionSettings;
    renderSettings: IHistoryGraphRenderSettings;
}

/**
 * Settings pertaining to graph excisions
 */
export interface IHistoryGraphExcisionSettings {
    excisionEnabled: boolean;
    emptyLineLengthLimit: number;
    emptyLineLengthMultiplier: number;
}

/**
 * Model for git history graph
 */
export interface IHistoryGraph {
    rows: IDictionaryStringTo<IHistoryGraphRow>;
    rowIdCommitIdMap: IDictionaryNumberTo<string>;
    settings: IHistoryGraphSettings;
    selectedCommitId: string;
    selectedExcisedParentCommitIds: string[];
    selectedExcisedChildCommitIds: string[];
    selectedOldestExcisedParentRowId: number;
    selectedYoungestExcisedChildRowId: number;

    /* Functions */
    select(selectedCommitId: string): void;
    unSelect(): void;
}

/**
 * Model for a row in the history graph
 */
export interface IHistoryGraphRow {
    id: number;
    commit: GitCommitRef;
    commitCellId: number;
    maxCellId: number;
    cells: IDictionaryNumberTo<VisualizationCell>;
    hasOutgoingExcisedCommits: boolean;
    hasIncomingExcisedCommits: boolean;
    hasOngoingExcisedCommitTrackingLine: boolean;
    isSelectedExcisedCommitParent: boolean;
    isSelectedExcisedCommitChild: boolean;
    isSelected: boolean;
    aboveCommitId: string;
    belowCommitId: string;
    parentCommitIds: string[];
    childCommitIds: string[];
    parentGraph: IHistoryGraph;

    /* Functions */
    highlightHorizontal(commitCellId: number, highlightDirection: HighlightDirection, highlightCentreAndAbove: boolean, highlightCentreAndBelow: boolean): void;
    highlightFromBelow(cellsBelow: IDictionaryNumberTo<VisualizationCell>): void;
    highlightFromAbove(cellsAbove: IDictionaryNumberTo<VisualizationCell>): void;
    unHighlight(): void;
    getExcisionCell(): VisualizationCell;
    getTracingCell(): VisualizationCell;
}