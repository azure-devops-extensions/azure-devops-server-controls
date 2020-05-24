// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Controls = require("VSS/Controls");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");

import {PathScopeFilterCategoryTextBoxAriaLabel} from "Search/Scripts/Resources/TFS.Resources.Search";

import domElem = Utils_UI.domElem;
import delegate = Utils_Core.delegate;

export class PathScopeInputTextBox extends Controls.BaseControl {
    private static PATH_SCOPE_FILTER_TEXT_AREA_CSS_CLASS: string = "path-scope-filter-text-area";
    private _$goBtn: JQuery;
    private _$inputBox: JQuery;
    private _pathNavigationHandler: (path: string, suppressPathChangeEvent: boolean) => Q.Promise<any>;
    private _loggingHandler: (source: string) => void;

    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({}, options));
    }

    public initialize() {
        super.initialize();
        this._loggingHandler = this._options["logHandler"];
        this._element.addClass(PathScopeInputTextBox.PATH_SCOPE_FILTER_TEXT_AREA_CSS_CLASS);
    }

    /*
    * Draw the text box.
    */
    public drawPathInputControl(): void {
        var _$inputControl = $(domElem("div")).addClass("input-control"),
            _$textWrap = $(domElem("div")).addClass("text-wrap");

        this._$goBtn = $(domElem("div")).addClass("btn-go bowtie-icon bowtie-arrow-right");
        this._$inputBox = $(domElem("input"))
            .attr("type", "text")
            .attr("aria-label", PathScopeFilterCategoryTextBoxAriaLabel);

        _$inputControl.append(this._$goBtn);
        _$textWrap.append(this._$inputBox);
        _$inputControl.append(_$textWrap);

        this._element.append(_$inputControl);

        // attache event handlers
        this._$goBtn.bind("click", delegate(this, this._onPathEntered));
        this._$inputBox.bind("keydown", delegate(this, this._onKeyDown));
    }

    /**
    * Set visibility of the text box.
    */
    public setExpand(expand: boolean) {
        if (this._element) {
            this._element.removeClass("collapsed");
            if (expand === false) { 
                this._element.addClass("collapsed");
            }
        }
    }

    public setPathValue(path: string): void {
        if (this._$inputBox &&
            path !== "") {
            this._$inputBox.val(path);
            this._$inputBox.attr("title", path);
        }
    }

    /**
    * Sets the handler to select the specified element specified by path in source tree entered by the user in the text box.
    */
    public setPathNavigationHandler(handler: any): void { 
        this._pathNavigationHandler = handler;
    }

    /*
    * handler to handler enter key press event.
    */
    private _onKeyDown(e?: any): void {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._onPathEntered();
        }
    }

    /*
    * Invoked on enter key press or "go" arrow click.
    * Ulitmately invokes "setSelectedItemPath" method of the PathScopeFilterCategory.
    * If path is found then the item is selected in the tree view other wise the promise is rejected.
    * The method will alert the user with alert message on rejection of promise signifying the occurrence
    * of an error.(e.g. non-existing path, premission denial etc.)
    */
    private _onPathEntered(): void {
        var enteredPath: string = this._$inputBox.val();
        
        // log telemetry for usage
        if (this._loggingHandler) {
            this._loggingHandler(Search_Constants.SearchConstants.PathScopeInputTextBoxTraceSourceName);
        }

        if (enteredPath !== "" && this._pathNavigationHandler) {
            this._pathNavigationHandler(enteredPath, false).then(null, (error) => {
                alert(error);
            });
        }
    }
}