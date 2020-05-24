import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";
import { domElem } from "VSS/Utils/UI";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as ReactDOM from "react-dom";

import { ChangeListSearchCriteria } from "TFS/VersionControl/Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

import * as Controls from "VSS/Controls";
import * as Dialogs from "VSS/Controls/Dialogs";
import * as  TfvcHistoryViewer from "VersionControl/Scenarios/Shared/TfvcHistoryViewer";
import { ChangeSetsListItem } from 'VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces';
import { ChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

export interface TfvcChangesetsPickerDialogOptions extends Dialogs.IModalDialogOptions {
    tfsContext?: TfsContext;
    repositoryContext?: RepositoryContext;
    myChangesLabel?: string;
    allChangesLabel?: string;
    linkTarget?: string;
}

export class TfvcChangesetsPickerDialog extends Dialogs.ModalDialogO<TfvcChangesetsPickerDialogOptions> {
    private _repositoryContext: RepositoryContext;
    private _searchCriteria: ChangeListSearchCriteria;
    private _$newTfvcChangesetsListContainer: JQuery;
    private _selectedChangeset: ChangeList;

    constructor(options?: TfvcChangesetsPickerDialogOptions) {
        super($.extend({
            initialFocusSelector: ".changesets-list-control .input-info-text"
        }, options));
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "vc-change-list-picker vc-item-picker"
        }, options));
    }

    public initialize(): void {
        super.initialize();

        this.updateOkButton(false);
        this._repositoryContext = this._options.repositoryContext;

        this._searchCriteria = {
            itemPath: "",
            itemVersion: "T",
        } as ChangeListSearchCriteria;

        const tfvcHistoryListProps: TfvcHistoryViewer.TfvcHistoryViewerProps = {
            searchCriteria: this._searchCriteria,
            repositoryContext: this._repositoryContext,
            showFilters: true,
            showPathControl: true,
            selectionMode: SelectionMode.single,
            onDrawComplete: this._onDrawComplete,
            onSelectionChanged: this._onSelectionChanged,
        };

        this._$newTfvcChangesetsListContainer = $(domElem("div", "history-list-container")).css("height", "100%").appendTo(this._element);
        TfvcHistoryViewer.renderTfvcHistoryViewer(this._$newTfvcChangesetsListContainer[0], tfvcHistoryListProps);

        // To clear the override of enter handler for input elements in base class, 
        // which makes datepicker inaccessible
        this.getElement().off("keydown");
    }

    public onClose(e?: JQueryEventObject): any {
        ReactDOM.unmountComponentAtNode(this._$newTfvcChangesetsListContainer[0]);
        super.onClose(e);
    }

    public getDialogResult(): ChangeList {
        // Returning the selected commit
        return this._selectedChangeset;
    }

    private _onDrawComplete = (): void => {
        this.setInitialFocus();
    }

    private _onSelectionChanged = (selection?: ChangeSetsListItem[]): void => {
        if (selection && selection.length > 0) {
            this._selectedChangeset = selection[0].item.changeList;
            this.updateOkButton(true);
        }
        else {
            this._selectedChangeset = null;
            this.updateOkButton(false);
        }
    }
}