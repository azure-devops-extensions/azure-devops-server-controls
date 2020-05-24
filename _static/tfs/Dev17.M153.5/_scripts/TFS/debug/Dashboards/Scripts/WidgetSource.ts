/** Describes the origin of the call to addWidget() */
export enum WidgetSource {
    /** The widget is being added as part of rendering the dashboard */
    Initialization,

    /** The widget is being added via the add button in the catalog */
    AddButton,

    /** The widget is being added by double clicking the widget tile in the catalog */
    DoubleClick,

    /** The widget is being added by dragging it from the catalog */
    DragAndDrop
}