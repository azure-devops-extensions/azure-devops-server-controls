/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { TeamIdentityReference, TfsIdentityReference } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as SearchCriteriaUtil from "VersionControl/Scripts/Utils/SearchCriteriaUtil";

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;

export class ShelvesetsSearchFilter extends Controls.BaseControl {

    private _repositoryContext: TfvcRepositoryContext;
    private _ownerCombo: Combos.Combo;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "vc-shelveset-list-filter"
        }, options));
    }

    public initialize() {
        super.initialize();

        this._repositoryContext = TfvcRepositoryContext.create(this._options.tfsContext);

        this._drawFilter(this._element);
    }

    private _drawFilter(element): void {
        let $filterTable,
            $filterRow,
            $filterCell,
            $filterLabelCell,
            $ownerInput;

        $filterTable = $(domElem("table", "filter-table")).appendTo(element);
        $filterRow = $(domElem("tr", "filter-row")).appendTo($filterTable);
        $filterLabelCell = $(domElem("td", "bowtie")).text(VCResources.FilterShelvesetOwnerText + ":").appendTo($filterRow);

        $filterCell = $(domElem("td", "vc-filter-control"));
        $ownerInput = $(domElem("input", "owner"))
            .attr("type", "text")
            .attr("id", "owner").attr("name", "owner")
            .appendTo($filterCell.appendTo($filterRow))
            .bind("keydown", delegate(this, this._onKeyDown));

        this._ownerCombo = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, $ownerInput, {
            cssClass: "owner-combo",
            allowEdit: true,
            source: [],
            change: (combo: Combos.Combo) => {
                this._handleFilterComboValueChange(combo, VCResources.FilterShelvesetOwnerText);
            },
            focus: () => {
                if (!this._ownerCombo.isDropVisible()) {
                    this._ownerCombo.showDropPopup();
                }
            },
            indexChanged: () => {
                this._onFindClick();
            }
        });

        const defaultOwner: string = SearchCriteriaUtil.getAuthorfromTFSIdentity({
            displayName: this._options.tfsContext.currentIdentity.displayName,
            alias: this._options.tfsContext.currentIdentity.uniqueName,
        });
        this._ownerCombo.setText(this._options.owner || defaultOwner);
        this._setTooltip();
        this._ownerCombo.getElement().addClass("has-selected-values");

        this._repositoryContext.getClient().beginGetAuthors(this._repositoryContext, (authors) => {
            if (!this.isDisposed()) {
                this._ownerCombo.setSource($.map(authors, (author, index) => {
                    const selectedAuthor: TfsIdentityReference = author as TfsIdentityReference;
                    return SearchCriteriaUtil.getAuthorfromTFSIdentity({
                        displayName: selectedAuthor.displayName,
                        alias: selectedAuthor.accountName
                    });
                }));
            }
        }, (error) => {
            Diag.log(Diag.LogVerbosity.Error, "Failed to get the repository's authors: " + VSS.getErrorMessage(error));
        });
    }

    public getSelectedOwner(): string {
        return $.trim(this._ownerCombo.getText());
    }

    public getSearchCriteria(): any {
        const tfsAuthor: SearchCriteriaUtil.TfsAuthorIdentity = SearchCriteriaUtil.getTFSIdentityfromAuthor(this.getSelectedOwner());

        const searchCriteria: any = {
            user: tfsAuthor.displayName,
            alias: tfsAuthor.alias,
        };
        return searchCriteria;
    }

    public setOwner(owner: string) {
        this._ownerCombo.setText(owner);
        this._setTooltip();
    }

    public dispose(): void {
        if (this._ownerCombo) {
            this._ownerCombo.dispose();
            this._ownerCombo = null;
        }

        super.dispose();
    }

    private _onFindClick(): void {
        this._fire("filter-updated", this.getSearchCriteria());
        this._setTooltip();
    }

    private _handleFilterComboValueChange(combo: Combos.Combo, text: string): void {
        if (combo && combo.getText().trim() === "") {
            Utils_UI.Watermark(combo.getInput(), { watermarkText: text });
            combo.getElement().removeClass("has-selected-values");
        } else {
            combo.getElement().addClass("has-selected-values");
        }
        this._setTooltip();
    }

    private _onKeyDown(e?: JQueryEventObject): any {
        /// <param name="e" type="JQueryEvent" />
        /// <returns type="any" />

        if (this.getSelectedOwner()) {
            if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                this._onFindClick();
                return false;
            }
        }
    }

    private _setTooltip(): void {
        const tooltip = this._getFormattedTooltip(VCResources.FilterShelvesetOwnerText, this._ownerCombo.getInputText());
        this._ownerCombo.getInput().attr("title", tooltip);
    }

    private _getFormattedTooltip(title: string, value: string): string {
        if (value != "") {
            return Utils_String.format(VCResources.FilterTooltipFormat, title, value);
        } else {
            return title;
        }
    }

}
