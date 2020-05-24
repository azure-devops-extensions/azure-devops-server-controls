import * as React from "react";

import { using } from "VSS/VSS";
import * as CodeHubCloneRepositoryAction_NO_REQUIRE from "VersionControl/Scripts/CodeHubCloneRepositoryAction";

import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";
import { ActionCreator } from  "VersionControl/Scenarios/ChangeDetails/Actions/ActionCreator";
import { HubPivotFiltersPanel } from  "VersionControl/Scenarios/ChangeDetails/Components/HubPivotFiltersPanel";
import { StoresHub } from  "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";

export interface IHubPivotFiltersPanelContainerProps extends IChangeDetailsPropsBase {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
}

export interface IHubPivotFiltersPanelContainerState {
    isFullScreenVisible: boolean;
    isDiffViewerToolBarVisible: boolean;
    isFileViewerToolBarVisible: boolean;
    isFullScreen: boolean;
    isCloneButtonVisible: boolean;
    isClonePopUpCreated: boolean;
}

/**
 *  Container for components present in the Hub Pivot Filters i.e, fullscreen, diffview settings, history filters.
 */
export class HubPivotFiltersPanelContainer extends React.Component<IHubPivotFiltersPanelContainerProps, IHubPivotFiltersPanelContainerState> {

    constructor(props: IHubPivotFiltersPanelContainerProps, context?: any) {
        super(props, context);

        this.state = this._getStateFromStores();
    }

    public componentDidMount(): void {
        this.props.storesHub.urlParametersStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.urlParametersStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {

        return (
            <HubPivotFiltersPanel
                isFullScreen={this.state.isFullScreen}
                isFullScreenVisible={this.state.isFullScreenVisible}
                isCloneButtonVisible={this.state.isCloneButtonVisible}
                isDiffViewerToolBarVisible={this.state.isDiffViewerToolBarVisible}
                isFileViewerToolBarVisible={this.state.isFileViewerToolBarVisible}
                fullScreenModeChangedCallback={this.props.actionCreator.toggleFullScreen}
                createClonePopUpCallback={this._createClonePopUp}
                customerIntelligenceData={this.props.customerIntelligenceData ? this.props.customerIntelligenceData.clone() : null} />
        );
    }

    private _onChange = (): void => {
        this.setState(this._getStateFromStores());
    }

    private _createClonePopUp = (element: JQuery): void => {

        using(["VersionControl/Scripts/CodeHubCloneRepositoryAction"], (CodeHubCloneRepositoryAction: typeof CodeHubCloneRepositoryAction_NO_REQUIRE) => {
            if (!this.state.isClonePopUpCreated) {
                const changeListViewOptions = this.props.actionCreator.changeListViewSource.getOptions();
                CodeHubCloneRepositoryAction.createCloneRepositoryPopup(element, {
                    repositoryContext: this.props.storesHub.contextStore.getRepositoryContext(),
                    openInVsLink: changeListViewOptions.openInVsLink,
                    sshEnabled: changeListViewOptions.sshEnabled,
                    sshUrl: changeListViewOptions.sshUrl,
                    cloneUrl: changeListViewOptions.cloneUrl,
                    branchName: (this.props.storesHub.changeListStore.versionSpec as any).branchName,
                    openedFromL2Header: false,
                });
                const isClonePopUpCreated = true;
                this.setState(this._getStateFromStores(isClonePopUpCreated));
            }
        });
    }

    private _getStateFromStores(isClonePopUpCreated?: boolean): IHubPivotFiltersPanelContainerState {
        const isContentsAction = this.props.storesHub.urlParametersStore.isContentsAction;
        const isCompareAction = this.props.storesHub.urlParametersStore.isCompareAction;
        const isHistoryAction = this.props.storesHub.urlParametersStore.isHistoryAction;
        const isFullScreen = this.props.storesHub.urlParametersStore.isFullScreen;

        return {
            isDiffViewerToolBarVisible: isCompareAction,
            isFileViewerToolBarVisible: isContentsAction,
            isFullScreenVisible: isCompareAction || isContentsAction,
            isFullScreen: isFullScreen,
            isCloneButtonVisible: (!this.props.actionCreator.changeListViewSource.getOptions().showCloneButtonOnL2Header) && (isCompareAction || isContentsAction),
            isClonePopUpCreated: !!isClonePopUpCreated,
        };
    }
}
