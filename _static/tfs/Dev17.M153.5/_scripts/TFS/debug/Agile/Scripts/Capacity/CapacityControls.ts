/// <reference types="jquery" />

import "VSS/LoaderPlugins/Css!Agile/Capacity/Capacity";

import Diag = require("VSS/Diag");
import ko = require("knockout");
import Controls = require("VSS/Controls");
import Utils_UI = require("VSS/Utils/UI");
import Capacity_ViewModels = require("Agile/Scripts/Capacity/CapacityViewModels");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

TFS_Knockout.overrideDefaultBindings()


var domElem = Utils_UI.domElem;

/**
 * @interface 
 * Interface for capacity add panel
 */
export interface ICapacityAddPanelOptions<T extends Capacity_ViewModels.ITeamCapacityAddPanelViewModel> {
    /**
    * The view model to bind to
    */
    addPanelViewModel: T;
}

/**
* The Add Panel control for Capacity page
*/
export class CapacityAddPanelControl<T extends Capacity_ViewModels.ITeamCapacityAddPanelViewModel> extends Controls.Control<ICapacityAddPanelOptions<T>> {
    private _$rootContainer: JQuery;
    private _$identityPickerControlContainer: JQuery;
    private static CAPACITY_ADD_PANEL_CONTROL_CLASS = "capacity-add-panel-control add-panel";
    private static CAPACITY_ADD_PANEL_CONTROL_ROOT_CONTAINER_CLASS = "capacity-add-panel-control-root-container";
    private static CAPACITY_ADD_PANEL_IDENTITY_PICKER_CONTAINER_CLASS = "capacity-add-panel-identitypicker-container";

    private static CAPACITY_ADD_PANEL_CONTROL_TEMPLATE = "capacity-add-panel-control-template";

    private _disposables: KnockoutDisposable[];

    constructor(options: ICapacityAddPanelOptions<T>) {
        Diag.Debug.assertParamIsObject(options, "options");
        Diag.Debug.assertParamIsObject(options.addPanelViewModel, "options.addPanelViewModel");

        super(options);
    }

    /**
     * Initialize the control.
     */
    public initialize() {
        super.initialize();
        this.getElement().addClass(CapacityAddPanelControl.CAPACITY_ADD_PANEL_CONTROL_CLASS);
        this._disposables = [];
        this._createControls();
        var $element = this.getElement();

        ko.computed(() => {
            if (this._options.addPanelViewModel.isVisible()) {
                $element.show();
                this._options.addPanelViewModel.focus();
            }
            else {
                $element.hide();
            }
        });

    }

    /** 
    * Dispose the control.
    */
    public dispose() {

        for (var i = 0, len = this._disposables.length; i < len; i++) {
            this._disposables[i].dispose();
        }

        this._disposables = [];

        if (this._options.addPanelViewModel) {
            this._options.addPanelViewModel.dispose();
            this._options.addPanelViewModel = null;
        }

        // This will clean up binding context. 
        ko.cleanNode(this.getElement()[0]);

        super.dispose();
    }

    /**
    * Creates the controls
    */
    private _createControls() {
        var $element = this.getElement();
        //Create the container and bind to knockout template
        this._$rootContainer = $(domElem("div", CapacityAddPanelControl.CAPACITY_ADD_PANEL_CONTROL_ROOT_CONTAINER_CLASS))
            .attr("data-bind", "template: { name: '" + CapacityAddPanelControl.CAPACITY_ADD_PANEL_CONTROL_TEMPLATE + "' }");

        $element.append(this._$rootContainer);

        ko.applyBindings(this._options.addPanelViewModel, this._$rootContainer[0]);

        //We can create the control after applyBindings only, because the container is coming from the template
        this._$identityPickerControlContainer = this._$rootContainer.find("." + CapacityAddPanelControl.CAPACITY_ADD_PANEL_IDENTITY_PICKER_CONTAINER_CLASS);
        this._options.addPanelViewModel.initialize(this._$identityPickerControlContainer, this._$rootContainer);
    }
}

/**
 * @interface 
 * Interface for capacity no content page
 */
export interface ICapacityNoContentOptions<T extends Capacity_ViewModels.TeamCapacityNoContentViewModel> {
    /**
    * The view model to bind to
    */
    noContentViewModel: T;
}

export class CapacityNoContentGutterControl<T extends Capacity_ViewModels.TeamCapacityNoContentViewModel> extends Controls.Control<ICapacityNoContentOptions<T>>{
    private _$rootContainer: JQuery;
    private static CAPACITY_NOCONTENT_GUTTER_CONTROL_TEMPLATE = "capacity-nocontent-gutter-control-template";
    private static CAPACITY_ADD_PANEL_CONTROL_ROOT_CONTAINER_CLASS = "hub-no-content-gutter-gutter-banner-root";

    constructor(options: ICapacityNoContentOptions<T>) {
        Diag.Debug.assertParamIsObject(options, "options");
        Diag.Debug.assertParamIsObject(options.noContentViewModel, "options.noContentViewModel");

        super(options);
    }

    /**
     * Initialize the control
     */
    public initialize() {
        super.initialize();
        this._createControls();
        var $element = this.getElement();

        ko.computed(() => {
            if (this._options.noContentViewModel.isVisible()) {
                $element.show();
            }
            else {
                $element.hide();
            }
        });
    }

    /**
    * Creates the controls
    */
    private _createControls() {
        var $element = this.getElement();
        // Create the container and bind that to knockout template
        this._$rootContainer = $(domElem("div", CapacityNoContentGutterControl.CAPACITY_ADD_PANEL_CONTROL_ROOT_CONTAINER_CLASS))
            .attr("data-bind", "template: { name: '" + CapacityNoContentGutterControl.CAPACITY_NOCONTENT_GUTTER_CONTROL_TEMPLATE + "' }");

        $element.append(this._$rootContainer);

        ko.applyBindings(this._options.noContentViewModel, this._$rootContainer[0]);
    }
}


