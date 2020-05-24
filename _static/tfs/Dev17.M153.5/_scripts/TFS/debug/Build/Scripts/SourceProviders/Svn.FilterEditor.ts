import { DefaultFilterEditorControl, FilterViewModel } from "Build/Scripts/FilterViewModel";

export class SvnFilterEditorControl extends DefaultFilterEditorControl {
    constructor(viewModel: FilterViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();
        var pathColumn = this.getElement().parent();
        var filterRow = pathColumn.parent();

        // We do not support excludes in the Svn branch filters of scheduled triggers,
        // Let's remove the entire column with the include/exclude list-box
        var ciTrigger = filterRow.parents(".buildvnext-scheduled-trigger");
        if (ciTrigger.length > 0) {
            var typeColumn = filterRow.find(".filter-type");
            typeColumn.remove();
        }
    }
}
