/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import Context = require("Build/Scripts/Context");

import BuildCommon = require("TFS/Build/Contracts");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Utils_String = require("VSS/Utils/String");

/**
 * Represents a branch/path filter
 */
export class FilterViewModel implements IFilterViewModel {
    /**
     * + if the filter includes items that match the pattern, - if not
     */
    public includeExclude: KnockoutObservable<string> = ko.observable("+");

    /**
     * The type of filter (branch, path)
     */
    public filterType: KnockoutObservable<string> = ko.observable("");

    /**
     * The pattern
     */
    public pattern: KnockoutObservable<string> = ko.observable("");

    public repository: KnockoutObservable<BuildCommon.BuildRepository> = ko.observable(null);

    constructor(filterType: string, filter: string, repo: BuildCommon.BuildRepository) {
        this.filterType(filterType);
        this.includeExclude(!filter ? "+" : filter.charAt(0));
        this.pattern(!filter ? "" : filter.substr(1));
        this.repository(repo);
    }

    public updateRepository(repository: BuildCommon.BuildRepository) {
        this.repository(repository);
    }

    /**
     * Gets the underlying value of the model.
     */
    public getValue(): string {
        return this.includeExclude() + this.pattern();
    }

    /**
     * Determines whether the specified value equals to current filter.
     */
    public equals(filter: string): boolean {
        return Utils_String.localeIgnoreCaseComparer(this.getValue(), filter) === 0;
    }

    public getEditorControl(): IPromise<any> {
        if (this.repository()) {
            var sourceProviderManager = Context.viewContext.sourceProviderManager;

            var sourceProvider = sourceProviderManager.getSourceProvider(this.repository.peek().type);
            if (!sourceProvider) {
                return null;
            }

            return sourceProvider.getFilterEditor(this.filterType.peek());
        }

        return Q(DefaultFilterEditorControl);
    }

    public dispose() {
        // do nothing?
    }

    public _isInvalid(): boolean {
        return this.pattern().trim().length == 0;
    }
}

/**
 * Base class for filter selection control
 */
export class FilterEditorControl extends Adapters_Knockout.TemplateControl<FilterViewModel> {

    constructor(viewModel: FilterViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();
    }

    public dispose(): void {
        super.dispose();
    }
}

/**
 * default filter selection control - a text box
 */
export class DefaultFilterEditorControl extends FilterEditorControl {

    constructor(viewModel: FilterViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();
        this.getElement().prepend("<input type=\"text\" data-bind=\"value: pattern, valueUpdate: 'afterkeydown'\" />");
    }
}
