import VSS = require("VSS/VSS");
import Events_Handlers = require("VSS/Events/Handlers");
import Diag = require("VSS/Diag");
import Utils_Core = require("VSS/Utils/Core");
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import TreeView = require("VSS/Controls/TreeView");
import TFS_Grid_Adapters = require("Presentation/Scripts/TFS/TFS.UI.Controls.Grid.DataAdapters");

var delegate = Utils_Core.delegate;
export class SimpleFieldControl {

    public static EVENT_FIELD_CHANGED: string = "field-changed";

    public static createIn(container: any, sort?: Function): SimpleFieldControl {
        /// <summary>Create and return a field control in a container </summary>
        /// <param name="container" type="object">the html element to create the control in</param>
        /// <param name="sort" type="Function" optional="true">(Optional) Comparison function for sorting data in the control</param>
        /// <returns type="SimpleFieldControl" />

        Diag.Debug.assertParamIsObject(container, "container");

        var $container = $(container),
            data = $("script", $container).eq(0).html(),
            config = null,
            fieldControl = null;

        if (data) {
            $container.empty();
            config = Utils_Core.parseMSJSON(data, false);
            fieldControl = new SimpleFieldControl($container, new TFS_Grid_Adapters.FieldDataProvider(config.treeValues || config.listValues, { sort: sort }));
        }
        return fieldControl;
    }

    private _$rootElement: any;
    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _control: any;
    private _dataProvider: any;
    private _options: any;

    constructor(rootElement: JQuery, fieldDataProvider: any, options?) {
        /// <summary>Create a new non-WIT field control control</summary>
        /// <param name="rootElement" type="jQuery">The container to use in drawing the controls.</param>
        /// <param name="fieldDataProvider" type="object">Field Data returned from server.</param>
        Diag.Debug.assertParamIsObject(rootElement, "rootElement");
        Diag.Debug.assertParamIsObject(fieldDataProvider, "fieldDataProvider");

        this._$rootElement = $(rootElement); // get root element
        this._dataProvider = fieldDataProvider; // assign provider
        this._events = new Events_Handlers.NamedEventCollection();
        this._options = options;
        this._createControl();
    }

    public setText(text: string) {
        /// <summary>Set the text of the control to the provided value.</summary>
        /// <param name="text" type="String">Text to set in the control.</param>

        this._control.setText(text);
        this._validate();
        this._raiseFieldChanged();
    }

    public getText(): string {
        /// <summary>Returns the text of the control.</summary>
        /// <returns type="String" />

        return $.trim(this._control.getText());
    }

    public setSelectedNodeById(nodeId: string) {
        /// <summary>Set the node with the provided ID to be the selected node.</summary>
        /// <param name="nodeId" type="String">ID of the node to select.</param>
        Diag.Debug.assertParamIsString(nodeId, "nodeId");

        var node = this._dataProvider.getNodeFromId(nodeId);

        // If the node exists, select it.
        if (node) {
            this.setText(node.path);
        }
    }

    public getSelectedNode() {
        /// <summary>Get the currently selected node.</summary>

        return this._dataProvider.getNode(this.getText());
    }

    public setInvalid(invalid: boolean) {
        /// <summary>set invalid state on the control</summary>
        /// <param name="invalid" type="Boolean">invalid flag</param>
        Diag.Debug.assertIsBool(invalid, "invalid is required boolean");

        this._control.setInvalid(invalid);
    }

    public focus() {
        this._control.focus();
    }

    public attachFieldChanged(handler: IEventHandler) {
        /// <summary>
        ///     Attach a handler for the EVENT_FIELD_CHANGED event.
        ///     The event handler will be invoked with a single object argument
        ///     in the following format:
        ///       args = {
        ///           textValue: <The new text of the field>,
        ///           node: <If the text value is valid, this will contain the node associated with the field>
        ///       }
        /// </summary>
        /// <param name="handler" type="IEventHandler">The handler to attach</param>
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(SimpleFieldControl.EVENT_FIELD_CHANGED, <any>handler);
    }

    public detachFieldChanged(handler: IEventHandler) {
        /// <summary>Remove a handler for the EVENT_FIELD_CHANGED event</summary>
        /// <param name="handler" type="IEventHandler">The handler to remove</param>
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(SimpleFieldControl.EVENT_FIELD_CHANGED, <any>handler);
    }

    private _createControl() {
        /// <summary>Create the Combo control that will display the values</summary>
        var that = this,
            nodes = null,
            comboOptions;

        comboOptions = {};

        comboOptions.change = delegate(this, function () {
            that._validate();
            that._raiseFieldChanged();
        });

        nodes = this._dataProvider.getNodes();

        // setup the tree as data source
        if (this._dataProvider.isTree()) {
            comboOptions.type = TreeView.ComboTreeBehaviorName; // set type to tree
        }
        else {
            comboOptions.mode = (nodes && nodes.length > 0) ? "drop" : "text"; // if not nodes then make it just text
        }

        comboOptions.source = nodes;

        // Create the control and trigger the validation on it.
        this._control = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, this._$rootElement, $.extend(comboOptions, this._options));
        this._validate();
    }

    private _validate() {
        /// <summary>Perform validation of the controls current value.</summary>
        this._control.setInvalid(!this._dataProvider.isValidValue(this.getText()));
    }

    private _raiseFieldChanged() {
        /// <summary>Notifies listeners that a change has been made to the field.</summary>

        this._events.invokeHandlers(SimpleFieldControl.EVENT_FIELD_CHANGED, this, {
            textValue: this.getText(),
            node: this.getSelectedNode()
        });
    }
}

VSS.initClassPrototype(SimpleFieldControl, {
    _$rootElement: null,
    _events: null,
    _control: null,
    _dataProvider: null,
    _options: null
});
