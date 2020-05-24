/// <reference types="knockout" />

/// Imports of 3rd Party ///
import ko = require("knockout");
/// Imports of VSS ///
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");

export interface ITemplateViewModel extends IDisposable {
    dispose(): void;
}

export class TemplateViewModel implements ITemplateViewModel {
    /**
     * Manager for disposables.
     */
    private _disposalManager: Utils_Core.DisposalManager;

    constructor() {
        this._disposalManager = new Utils_Core.DisposalManager();
    }

    /**
     * Disposes all disposables.
     */
    public dispose(): void {
        this._disposalManager.dispose();
    }

    /**
     * Proxy for a knockout subscription to keep track of it to ensure that when the control is disposed, subscription is also disposed.
     */
    public subscribe(subscribable: KnockoutSubscribable<any>, callback: (newValue: any) => void): IDisposable {
        return this._disposalManager.addDisposable<IDisposable>(subscribable.subscribe(callback));
    }

    /**
     * Proxy for a knockout computed to keep track of it to ensure that when the control is disposed, computed is also disposed.
     */
    public computed(func: () => any): KnockoutComputed<any> {
        return this._disposalManager.addDisposable<KnockoutComputed<any>>(ko.computed(func));
    }

    /**
     * Adds a disposable object to the list
     */
    public _addDisposable(disposable: IDisposable): IDisposable {
        return this._disposalManager.addDisposable(disposable);
    }
}

// List of registered template controls
var templateControlList: { [id: string]: TemplateControlRegistration } = {};

export interface TemplateControlRegistration {
    /**
     * Type of the control to be registered.
     */
    controlType: any;

    /**
     * Delegate used to generate the view model for the registered control.
     */
    viewModelGenerator: (context?: any) => ITemplateViewModel;
}

export interface TemplateControlOptions {
    /**
     * Html template is going to be set as the html content for the element.
     */
    templateHtml?: string;

    /**
     * If templateId is used there needs to be a script element (with type="text/html") 
     * in the DOM with the id equal to templateId.
     * This templateId will be used to get the template from the DOM.
     */
    templateId?: string;
}

export interface ITemplateControl {
    /**
     * Applies the template binding on the specified element.
     *
     * @param element Element owning the template and viewmodel to be bound.
     */
    applyBinding(element: JQuery): void;

    /**
     * Perform verious disposals for the control.
     */
    dispose(): void;
}

export class TemplateControl<TViewModel extends ITemplateViewModel> extends Controls.BaseControl implements ITemplateControl {

    /**
     * Registers a template control to be invoked later.
     *
     * @param templateId Id of the template.
     * @param controlType Type of the registered control.
     * @param viewModelGenerator Delegate to generate the viewmodel.
     */
    public static registerBinding(templateId: string, controlType: any, viewModelGenerator: (context?: any) => ITemplateViewModel): void {
        if (!templateId) {
            throw new Error("You must specify templateId to register a control type.");
        }

        if (!controlType) {
            throw new Error("You must specify control type to register.");
        }

        if (!viewModelGenerator) {
            throw new Error("You must specify viewmodel generator to register.");
        }

        templateControlList[templateId] = {
            controlType: controlType,
            viewModelGenerator: viewModelGenerator
        };
    }

    /**
     * Creates a new template control using registered control specified by template id.
     *
     * @param templateId Id of the template.
     * @param element Element owning the template and viewmodel to be bound.
     * @param viewModelContext Context used to generate view model.
     * @return New instance of the control.
     */
    public static applyRegisteredBinding<TControl extends ITemplateControl, TViewModel extends ITemplateViewModel>(templateId: string, element: JQuery, viewModelContext: any): TControl {
        // Perform apply if a templateId is specified
        if (templateId) {
            // Find the registered control
            var registration = templateControlList[templateId];
            if (registration) {
                // If registered control found, use it for binding
                return TemplateControl.applyBinding<TControl, TViewModel>(registration.controlType, element, <TViewModel>registration.viewModelGenerator(viewModelContext), { templateId: templateId });
            }
        }

        // No control with this id registered
        return null;
    }

    /**
     * Creates a new template control using the specified type, element and options.
     *
     * @param controlType Type of the control.
     * @param element Element owning the template and viewmodel to be bound.
     * @param viewModel View model used for binding. 
     * @param options Template options like templateHtml and templateId.
     * @return New instance of the control.
     */
    public static applyBinding<TControl extends ITemplateControl, TViewModel>(controlType: any, element: JQuery, viewModel: TViewModel, options: TemplateControlOptions): TControl {

        if (!options.templateHtml && !options.templateId) {
            throw new Error("You must specify templateHtml or templateId to instantiate a template control.");
        }

        if (!viewModel) {
            throw new Error("You must specify viewModel to instantiate a template control.");
        }

        var control = <TControl>new controlType(viewModel, options);

        control.applyBinding(element);

        return control;
    }

    /**
     * View model used for binding.
     */
    private _viewModel: TViewModel;

    /**
     * Manager for disposables.
     */
    private _disposalManager: Utils_Core.DisposalManager;

    /**
     * Do not use this! Instead, use TemplateControl.applyBinding.
     */
    constructor(viewModel: TViewModel, options?: TemplateControlOptions) {
        super(options);
        this._viewModel = viewModel;
        this._disposalManager = new Utils_Core.DisposalManager();
    }

    /**
     * Gets the viewmodel bound to this control.
     */
    public getViewModel(): TViewModel {
        return this._viewModel;
    }

    /**
     * See interface.
     */
    public applyBinding(element: JQuery): void {
        // Set and initialize element
        this._setElement(element);
        this._initializeElement();

        // Perform actual binding. 
        this._performBinding(element, <TemplateControlOptions>this._options);

        // Initialize control
        this._attemptInitialize();
    }

    /**
     * Proxy for a knockout subscription to keep track of it to ensure that when the control is disposed, subscription is also disposed.
     */
    public subscribe(subscribable: KnockoutSubscribable<any>, callback: (newValue: any) => void): IDisposable {
        return this._disposalManager.addDisposable<IDisposable>(subscribable.subscribe(callback));
    }

    /**
     * Proxy for a knockout computed to keep track of it to ensure that when the control is disposed, computed is also disposed.
     */
    public computed(func: () => any): KnockoutComputed<any> {
        return this._disposalManager.addDisposable<KnockoutComputed<any>>(ko.computed(func));
    }

    /**
     * See base.
     */
    _cleanup(): void {
        super._cleanup();

        var element = this.getElement();
        if (element) {
            // Cleans knockout related stuff from the element
            this.getElement().removeAttr("data-bind");
            ko.cleanNode(this.getElement()[0]);
            
            // Dispose
            this._disposalManager.dispose();
            this._viewModel.dispose();
        }
    }

    /**
     * Default template binding which is knockout. 
     * By overriding this method, a different binding pattern can be used.
     */
    _performBinding(element: JQuery, options: TemplateControlOptions): void {
        // Select which template to use for binding
        if (options.templateHtml) {
            element.html(options.templateHtml);
        } else if (options.templateId) {
            element.attr("data-bind", Utils_String.format("template: {{ name: '{0}' }}", options.templateId));
        }

        // Apply binding
        ko.applyBindings(this.getViewModel(), element[0]);
    }
}
