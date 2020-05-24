import Controls = require("VSS/Controls");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Resources_Presentation = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var delegate = Utils_Core.delegate;

export class SidebarSearch extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.sidebarSearch";

    public _input: JQuery;
    public _button: JQuery;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "sidebar-search"
        }, options));
    }

    public getSearchWaterMarkText() {
        return TFS_Resources_Presentation.SidebarSearchWatermark;
    }

    public initialize() {
        let title = this.getSearchWaterMarkText();

        let container = this._element.find(".search-input-wrapper");
        if (container.length === 0) {
            container = $("<div class='search-input-wrapper' />").appendTo(this._element);
        }

        let inputContainer = $("<div class='search-input-container' />").appendTo(container);

        this._input = $(`<input type='text' class='input' placeholder=${title} />`).appendTo(inputContainer).attr("aria-label", title);
        this._button = $("<span class='bowtie-icon bowtie-search button' />").appendTo(container);

        this._attachEvents();
        this._input.focus();
        super.initialize();
    }

    public _changeSearchIcon(clear) {
        this._button.addClass(clear ? "bowtie-search" : "bowtie-edit-remove");
        this._button.removeClass(clear ? "bowtie-edit-remove" : "bowtie-search");
    }

    public clearSearch() {
        this._fire('clearSearch');
    }

    public executeSearch(searchText) {
        this._fire('executeSearch', { searchText: searchText });
    }

    private _attachEvents() {
        this._bind(this._input, "mouseup", delegate(this, this._onSearch));
        this._bind(this._input, "keyup", delegate(this, this._onSearch));
        this._bind(this._button, "click", delegate(this, this._onClearSearch));
    }

    private _onSearch(e?) {
        let searchText = $.trim(this._input.val());

        if (e.keyCode === Utils_UI.KeyCode.ESCAPE) {
            this._onClearSearch();
            return;
        }

        this.cancelDelayedFunction("onSearch");

        if (searchText) {
            this._changeSearchIcon(false);
            this.delayExecute("onSearch", this._options.eventTimeOut || 250, true, function () {
                this.executeSearch(searchText);
            });
        }
        else {
            this._clearSearch();
        }
    }

    private _onClearSearch() {
        this._input.val("");
        this._input.blur();
        this._clearSearch();
    }

    private _clearSearch() {
        this._changeSearchIcon(true);
        this.clearSearch();
    }
}

VSS.classExtend(SidebarSearch, TFS_Host_TfsContext.TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(SidebarSearch, ".sidebar-search.enhance")
