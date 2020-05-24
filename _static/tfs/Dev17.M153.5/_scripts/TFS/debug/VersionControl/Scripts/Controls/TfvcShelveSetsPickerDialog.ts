import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";
import * as ReactDOM from "react-dom";
import { domElem } from "VSS/Utils/UI";
import * as Dialogs from "VSS/Controls/Dialogs";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ShelvesetFilter, ShelvesetFilterSearchCriteria, ShelvesetFilterProps } from "VersionControl/Scenarios/History/TfvcHistory/Components/ShelvesetFilter";
import { HistoryEntry, ChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as  TfvcShelvesetsViewer from "VersionControl/Scenarios/Shared/TfvcShelvesetsViewer";

export interface TfvcShelveSetsPickerDialogOptions extends Dialogs.IModalDialogOptions {
    repositoryContext?: RepositoryContext;
    tfsContext?: TfsContext;
    linkTarget?: string;
}

export class TfvcShelveSetsPickerDialog extends Dialogs.ModalDialogO<TfvcShelveSetsPickerDialogOptions> {
    private _repositoryContext: RepositoryContext;
    private _selectedShelveset: ChangeList;
    private _$newTfvcShelveSetsListContainer: JQuery;

    constructor(options?) {
        super($.extend({
            initialFocusSelector: ".shelvesets-list-container .identity-picker-resolved"
        }, options));
    }

    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            coreCssClass: "vc-shelvesets-list-picker vc-item-picker"
        }, options));
    }

    public initialize(): void {
        super.initialize();

        this.updateOkButton(false);
        this._repositoryContext = TfvcRepositoryContext.create(this._options.tfsContext);

        const tfvcShelvesetsViewerProps: TfvcShelvesetsViewer.TfvcShelvesetsViewerProps = {
            repositoryContext: this._repositoryContext,
            selectionMode: SelectionMode.single,
            onDrawComplete: this._onDrawComplete,
            onSelectionChanged: this._onSelectionChanged,
        };

        this._$newTfvcShelveSetsListContainer = $(domElem("div", "shelvesets-list-container")).appendTo(this._element);
        TfvcShelvesetsViewer.renderTfvcShelveSetsList(this._$newTfvcShelveSetsListContainer[0], tfvcShelvesetsViewerProps);
    }

    public onClose(e?: JQueryEventObject): any {
        ReactDOM.unmountComponentAtNode(this._$newTfvcShelveSetsListContainer[0]);
        super.onClose(e);
    }

    public getDialogResult(): ChangeList {
        // Returning the selected commit
        return this._selectedShelveset;
    }

    private _onDrawComplete = (): void => {
        this.setInitialFocus();
    }

    private _onSelectionChanged = (selection?: HistoryEntry[]): void => {
        if (selection && selection.length > 0) {
            this._selectedShelveset = selection[0].changeList;
            this.updateOkButton(true);
        }
        else {
            this._selectedShelveset = null;
            this.updateOkButton(false);
        }
    }
}