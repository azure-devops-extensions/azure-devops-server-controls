import * as React from "react";
import * as ReactDOM from "react-dom";

import { DefaultButton } from "OfficeFabric/Button";
import { Checkbox } from "OfficeFabric/Checkbox";

import { ExtensionService } from "VSS/Contributions/Services";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getRunningDocumentsTable, RunningDocumentsTableEntry } from "VSS/Events/Document";
import * as ComponentBase from "VSS/Flux/Component";
import { getService } from "VSS/Service";
import { IContributedPivotProps, registerPivot } from "VSSPreview/Utilities/PivotContributions";
import { IObservableValue } from "VSS/Core/Observable";
import { IViewOptions } from "VSSUI/Utilities/ViewOptions";

import { IPivotContext } from "./Hub";

interface IListPivotProps extends IContributedPivotProps<IPivotContext, IListPivotActionContext>, ComponentBase.Props {

}

interface IListPivotState {
    index: number;
    minIndex: number;
    maxIndex: number;
}

/**
 * Context that the pivot provides to its contributed actions.
 */
export interface IListPivotActionContext {
    atBottom: boolean;
    atTop: boolean;
    selectDown: () => void;
    selectUp: () => void;
}

function contextInfo<TState>(pivotContext: IPivotContext, state: TState, dataProviderContributionId: string, forceUpdate: () => void): JSX.Element {
    // We try to get the data provider data for all pivots and show it on all pivots just to show
    // what is loaded. In the real world a pivot would only access its own data providers.
    const webPageSvc = getService(WebPageDataService);
    const listPivotData = webPageSvc.getPageData("ms.vss-tfs-web.hub-contributions-sample-hub:pivotbar:listPivot:dataProvider");
    const togglePivotData = webPageSvc.getPageData("ms.vss-tfs-web.hub-contributions-sample-hub:pivotbar:togglePivot:dataProvider");

    const thisPivotsDataLoaded = !!webPageSvc.getPageData(dataProviderContributionId);

    return (
        <div>
            <h3>Pivot Context:</h3>
            <pre>{JSON.stringify({ ...pivotContext, viewOptions: undefined }, null, 4)}</pre>
            <h3>State:</h3>
            <pre>{JSON.stringify(state, null, 4)}</pre>
            <h3>View Options:</h3>
            <pre>{pivotContext.viewOptions && JSON.stringify(pivotContext.viewOptions.getViewOptions(), null, 4)}</pre>
            <h3>Data Providers:</h3>
            <pre>{JSON.stringify({ listPivotData, togglePivotData }, null, 4)}</pre>
            <DefaultButton disabled={thisPivotsDataLoaded} onClick={() => getData(dataProviderContributionId).then(() => { forceUpdate(); })}>Load Data</DefaultButton>
        </div>
    );
}

function getData(dataProviderContributionId: string): IPromise<{}> {
    const extensionService = getService(ExtensionService);

    return extensionService.getContributions([dataProviderContributionId], /* includeRootItems */ true, /* includeChildren */ true);
}

/**
 * Implements a pivot that pretends to have a list of items. Contributed view actions can move the
 * selection index up and down.
 */
class ListPivot extends ComponentBase.Component<IListPivotProps, IListPivotState> {
    private static pivotConstructionCount = 0;
    private _runningDocument: RunningDocumentsTableEntry;

    constructor(props: IListPivotProps, context?: any) {
        super(props, context);

        this.state = {
            index: 1,
            minIndex: 1,
            maxIndex: 4,
        };

        ListPivot.pivotConstructionCount++;
    }

    public componentWillMount(): void {
        this._updateActionContext();
    }

    public componentWillUnmount(): void {
        // need to make sure we don't leak dirty documents so that we don't block changing when
        // we're not the active pivot
        this._setDirty(false);
    }

    public componentDidUpdate(): void {
        this._updateActionContext();
    }

    public render(): JSX.Element {
        return (
            <div>
                <h2>List Pivot</h2>
                <p>This is a contributed pivot with contributed view actions and shared context.</p>
                <p>This class has been constructed {ListPivot.pivotConstructionCount} times.</p>
                <Checkbox
                    label="Dirty (block pivot change)"
                    onChange={(ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => { this._setDirty(checked); }}
                />
                <DefaultButton onClick={this._selectDown} disabled={this.state.index === this.state.minIndex}>Down</DefaultButton>
                <DefaultButton onClick={this._selectUp} disabled={this.state.index === this.state.maxIndex}>Up</DefaultButton>
                {contextInfo(this.props.pivotContext, this.state, "ms.vss-tfs-web.hub-contributions-sample-hub:pivotbar:listPivot:dataProvider", this.forceUpdate.bind(this))}
            </div>
        );
    }
    
    /**
     * Update action context with latest selection information. The contributed actions will have
     * a listener set up on the actionContext object and update themselves accordingly.
     */
    private _updateActionContext(): void {
        this.props.actionContext.value = {
            atBottom: this.state.index === this.state.minIndex,
            atTop: this.state.index === this.state.maxIndex,
            selectDown: this._selectDown,
            selectUp: this._selectUp,
        };
    }

    /**
     * Callback passed to the contributed actions to let them update our state.
     */
    private _selectDown = () => {
        if (this.state.index > this.state.minIndex) {
            this.setState({ index: this.state.index - 1 });
        }
    }

    /**
     * Callback passed to the contributed actions to let them update our state.
     */
    private _selectUp = () => {
        if (this.state.index < this.state.maxIndex) {
            this.setState({ index: this.state.index + 1 });
        }
    }

    private _setDirty = (dirty: boolean) => {
        const runningDocumentsTable = getRunningDocumentsTable();
        if (dirty) {
            if (!this._runningDocument) {
                this._runningDocument = runningDocumentsTable.add("ListPivotRunningDocument", { isDirty: () => true });
            }
        }
        else {
            if (this._runningDocument) {
                runningDocumentsTable.remove(this._runningDocument);
                this._runningDocument = null;
            }
        }
    }
}

interface ITogglePivotProps extends IContributedPivotProps<IPivotContext, ITogglePivotActionContext>, ComponentBase.Props {

}

interface ITogglePivotState {
    enabled: boolean;
}

/**
 * Context that the TogglePivot provides its contributed actions.
 */
export interface ITogglePivotActionContext {
    enabled: boolean;
    setEnabled: (value: boolean) => void;
}

/**
 * Implements a pivot that has a view action that can enable or disable a function.
 */
class TogglePivot extends ComponentBase.Component<ITogglePivotProps, ITogglePivotState> {
    constructor(props: ITogglePivotProps, context?: any) {
        super(props, context);

        this.state = {
            enabled: true,
        };
    }

    public componentWillMount(): void {
        this._updateActionContext();
    }

    public componentDidUpdate(): void {
        this._updateActionContext();
    }

    public render(): JSX.Element {
        return (
            <div>
                <h2>Toggle Pivot</h2>
                <p>This pivot illustrates a simple toggle view action, and subscribing to Hub view state.</p>
                <DefaultButton onClick={() => { this._setEnabled(true); }} disabled={this.state.enabled}>Enable</DefaultButton>
                <DefaultButton onClick={() => { this._setEnabled(false); }} disabled={!this.state.enabled}>Disabled</DefaultButton>
                {contextInfo(this.props.pivotContext, this.state, "ms.vss-tfs-web.hub-contributions-sample-hub:pivotbar:togglePivot:dataProvider", this.forceUpdate.bind(this))}
            </div>
        );
    }

    /**
     * Update action context with latest information. The contributed actions will have
     * a listener set up on the actionContext object and update themselves accordingly.
     */
    private _updateActionContext(): void {
        this.props.actionContext.value = {
            enabled: this.state.enabled,
            setEnabled: this._setEnabled,
        };
    }

    /**
     * Callback passed to the contributed actions to let them update our state.
     */
    private _setEnabled = (value: boolean): void => {
        if (value !== this.state.enabled) {
            this.setState({ enabled: value });
        }
    }
}

interface IThirdPivotProps extends IContributedPivotProps<IPivotContext, {}>, ComponentBase.Props {

}

/**
 * Implements a pivot that doesn't do much.
 */
class ThirdPivot extends ComponentBase.Component<IThirdPivotProps, {}> {
    public render(): JSX.Element {
        return (
            <div>
                <h2>Third Pivot</h2>
                <p>Hello world</p>
            </div>
        );
    }
}

// Register pivot register ListPivot to provide the contributed pivot content targetting the given
// id. This function also handles creating the IObservableValue<IActionContext> that is used to for
// passing context to the contributed actions.
// Note that the contribution must be defined with dynamic: true in order for the context sharing to
// work.
registerPivot(ListPivot, "ms.vss-tfs-web.hub-contributions-sample-hub:pivotbar:listPivot", "listPivot.pivot");
registerPivot(TogglePivot, "ms.vss-tfs-web.hub-contributions-sample-hub:pivotbar:togglePivot", "togglePivot.pivot");
registerPivot(ThirdPivot, "ms.vss-tfs-web.hub-contributions-sample-hub:pivotbar:thirdPivot", "thirdPivot.pivot");
