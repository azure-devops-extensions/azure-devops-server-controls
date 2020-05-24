/// <reference types="jquery" />
import { autobind } from "OfficeFabric/Utilities";
import { ITestResultViewContextPayload, TestResultDetailsActionHub } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/TestResultDetailsActionHub";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { Store } from "VSS/Flux/Store";

export enum DetailsPaneMode {
    Off,
    HalfScreen,
    FullScreen
}

export interface ITestResultsViewState {
    detailsPaneMode: DetailsPaneMode;
    isLoading: boolean;
    context: Common.IViewContextData;
    errorMessage?: string;
    errorCode?: any;
}

export class TestResultsViewStore extends Store {

    constructor(private _resultDetailsActionsHub: TestResultDetailsActionHub) {
        super();
        this._initialize();
        this._resultDetailsActionsHub.openDetailsPane.addListener(this._openDetailsPaneInHalfScreen);
        this._resultDetailsActionsHub.closeDetailsPane.addListener(this._closeDetailsPanel);
        this._resultDetailsActionsHub.enterDetailsPaneFullScreen.addListener(this._openDetailsPaneInFullScreen);
        this._resultDetailsActionsHub.exitDetailsPaneFullScreen.addListener(this._openDetailsPaneInHalfScreen);
        this._resultDetailsActionsHub.onResultsLoaded.addListener(this._onResultsRendered);
    }

    public getState(): ITestResultsViewState {
        return this._state;
    }

    private _initialize(): void {
        this._state = this._getDefaultState();
    }

    @autobind
    private _onResultsRendered(testResultViewContext: ITestResultViewContextPayload) {
        this._state.isLoading = false;
        this._state.errorMessage = testResultViewContext.errorMessage;
        this._state.errorCode = testResultViewContext.errorCode;
        this._state.context = testResultViewContext.context;
        this.emitChanged();
    }

    @autobind
    private _openDetailsPaneInHalfScreen() {
        this._state.detailsPaneMode = DetailsPaneMode.HalfScreen;

        this.emitChanged();
    }

    @autobind
    private _openDetailsPaneInFullScreen() {
        this._state.detailsPaneMode = DetailsPaneMode.FullScreen;

        this.emitChanged();
    }

    @autobind
    private _closeDetailsPanel() {
        this._state.detailsPaneMode = DetailsPaneMode.Off;

        this.emitChanged();
    }

    private _getDefaultState(): ITestResultsViewState {
        return {
            detailsPaneMode: DetailsPaneMode.Off,
            isLoading: true
        } as ITestResultsViewState;
    }

    private _state: ITestResultsViewState;
}