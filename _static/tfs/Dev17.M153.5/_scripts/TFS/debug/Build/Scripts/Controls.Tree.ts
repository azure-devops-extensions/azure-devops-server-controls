/// <reference types="jquery" />



import ko = require("knockout");

import KnockoutExtensions = require("Build/Scripts/KnockoutExtensions");

import VSS = require("VSS/VSS");

KnockoutExtensions.KnockoutCustomHandlers.initializeKnockoutHandlers();

export interface ITreeNode {
    /**
     * The text displayed in the tree
     */
    text: KnockoutSubscribable<string>;

    /**
     * Whether the node is displayed as a folder
     */
    isFolder: KnockoutSubscribable<boolean>;
    
    /**
     * Whether the node is expanded
     */
    expanded: KnockoutSubscribable<boolean>;

    /**
     * Whether to show an icon for the node
     */
    showIcon: KnockoutSubscribable<boolean>;

    /**
     * The children of this node
     */
    children: KnockoutObservableArray<ITreeNode>;

    /**
     * The value of the node
     */
    value: any;

    /**
     * Associates a Widget with the node
     * @param widget The widget
     */
    setWidget(widget: Widget);
}

/**
 * A basic tree node
 */
export class TreeNode implements ITreeNode {
    /**
     * The text displayed in the tree
     */
    public text: KnockoutObservable<string> = ko.observable("");

    /**
     * Whether the node is displayed as a folder
     */
    public isFolder: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * Whether the node is expanded
     */
    public expanded: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * Whether to show an icon for the node
     */
    public showIcon: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * The children of this node
     */
    public children: KnockoutObservableArray<TreeNode> = ko.observableArray<TreeNode>([]);

    /**
     * The value of the node
     */
    public value: any;

    private _widget: Widget;

    constructor() {
    }

    /**
     * Associates a Widget with the node
     * @param widget The widget
     */
    public setWidget(widget: Widget) {
        this._widget = widget;
    }

    private _onNodeClick(eventObject: JQueryEventObject, args: any) {
        if (this.isFolder()) {
            this.expanded(!this.expanded());
        }
    }
}

export class ViewModel {

    public nodes: KnockoutObservableArray<ITreeNode> = ko.observableArray<ITreeNode>([]);

    private _widget: Widget;

    constructor(nodes?: ITreeNode[]);

    constructor(nodes?: KnockoutObservableArray<ITreeNode>);

    constructor(nodes?: any) {
        if (!!nodes) {
            if ($.isArray(nodes)) {
                if (!!nodes) {
                    this.nodes(nodes);
                }
            }
            else if ($.isFunction(nodes)) {
                this.nodes = nodes;
            }
        }

        this.nodes.subscribeArrayChanged(
            (addedItem: ITreeNode) => {
                addedItem.setWidget(this._widget);
            },
            (removedItem: ITreeNode) => {
                removedItem.setWidget(null);
            });
    }

    /**
     * Associates a Widget with each node
     * @param widget The widget
     */
    public setWidget(widget: Widget) {
        this._widget = widget;

        $.each(this.nodes(), (index: number, node: ITreeNode) => {
            node.setWidget(this._widget);
        });
    }
}

export class Widget {

    private _$element: JQuery;
    private _viewModel: ViewModel;

    constructor(element: JQuery, options: ViewModel);

    constructor(element: JQuery, options: Object);

    constructor(element: JQuery, options: any) {
        var that = this;

        this._$element = element;
        this._viewModel = options;

        this._viewModel.setWidget(this);

        ko.applyBindings(this._viewModel, this._$element[0]);
    }

}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Controls.Tree", exports);
