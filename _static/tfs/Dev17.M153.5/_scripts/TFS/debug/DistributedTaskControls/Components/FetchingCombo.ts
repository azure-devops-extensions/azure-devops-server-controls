
import * as Q from "q";

import { ComboLoadingComponent, ComboLoadingHelper } from "DistributedTaskControls/Components/ComboLoadingComponent";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { getRTLSafeKeyCode, KeyCodes } from "OfficeFabric/Utilities";

import { ComboO, IComboOptions } from "VSS/Controls/Combos";

export interface IFetchingComboOptions extends IComboOptions {
    refreshData: () => Q.Promise<void>;
    hasNoResultsSection?: boolean;
}

export class FetchingCombo extends ComboO<IFetchingComboOptions> {
    public toggleDropDown(): void {
        this._loadingHelper.setLoadingComponentDismissed(false);
        let source = (this.getBehavior() && this.getBehavior().getDataSource()) ? this.getBehavior().getDataSource().getSource() : [];
        if (!this.isDropVisible() && (!source || source.length === 0) && !this._isLoadingVisible) {
            this._createLoadingComponent();
        }
        else {
            this._removeCustomComponents();
        }
        let fetchDone = this._options.refreshData();
        if (!!fetchDone) {
            fetchDone.then(() => {
                this.removeLoadingComponent();
                //do not expand the dropdown if earlier the loading component was dismissed by the user
                if (!this.isDisposed() && !this._loadingHelper.isLoadingComponentDismissed()) {
                    super.toggleDropDown();
                    if (this.isDropVisible() && this._options.hasNoResultsSection) {
                        this._showNoResultsSectionIfRequired();
                    }
                }
            }, (error) => {
                this._removeCustomComponents();
            });
        } else {

            if (!this.isDisposed()) {
                this.removeLoadingComponent();
                if (!this._loadingHelper.isLoadingComponentDismissed()) {
                    super.toggleDropDown();
                }
            }
        }
    }

    public hideDropPopup() {
        this._removeCustomComponents();
        super.hideDropPopup();
    }

    public dispose() {
        this._removeCustomComponents();
        super.dispose();
    }

    public _onInputKeyDown(e?: JQueryEventObject): any {
        if (e.keyCode === getRTLSafeKeyCode(KeyCodes.down) ||
            e.keyCode === getRTLSafeKeyCode(KeyCodes.up)) {
            e.preventDefault();
        }
        if (e.keyCode === getRTLSafeKeyCode(KeyCodes.escape) && this.isDropVisible()) {
            e.stopPropagation();
        }

        super._onInputKeyDown(e);
    }

    public removeLoadingComponent(): void {
        this._isLoadingVisible = false;
        let parentContainer: HTMLElement = !this.isDisposed() ? this.getElement()[0].parentElement : null;
        this._loadingHelper.removeLoadingComponent(this.isDisposed(), parentContainer);
    }

    private _createLoadingComponent(): void {
        // Render the loading component
        this._isLoadingVisible = true;
        let parentContainer: HTMLElement = !this.isDisposed() ? this.getElement()[0].parentElement : null;
        this._loadingHelper.createLoadingComponent(parentContainer);
    }

    private _showNoResultsSectionIfRequired(): void {
        let source = (this.getBehavior() && this.getBehavior().getDataSource()) ? this.getBehavior().getDataSource().getSource() : [];
        if (!source || source.length === 0) {
            let parentContainer: HTMLElement = !this.isDisposed() ? this.getElement()[0].parentElement : null;
            this._loadingHelper.showNoResultsSection(parentContainer);
        }
    }

    private _removeNoResultsSection(): void {
        let parentContainer: HTMLElement = !this.isDisposed() ? this.getElement()[0].parentElement : null;
        this._loadingHelper.removeNoResultsComponent(this.isDisposed(), parentContainer);
    }

    private _removeCustomComponents(): void {
        this.removeLoadingComponent();
        if (this._options.hasNoResultsSection) {
            this._removeNoResultsSection();
        }
    }

    private _loadingHelper: ComboLoadingHelper = new ComboLoadingHelper();
    private _isLoadingVisible: boolean = false;
}