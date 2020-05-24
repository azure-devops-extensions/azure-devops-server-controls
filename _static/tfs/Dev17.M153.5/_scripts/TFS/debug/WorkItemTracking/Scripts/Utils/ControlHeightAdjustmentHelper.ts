import Diag = require("VSS/Diag");

/**
 * This class contains utility to auto adjust control height, used by both Links and Attachments control
 */
class ControlHeightAdjustmentHelper {

    /**
     *   @deprecated Please don't use this, use the getAvailableSpace methods on the work item control.
     *   This method adjusts the control height to fit the form height on NEW WIT FORM.
         Read the comment below for details, the major problem here is: 100% height won't work because Grid control has absolute children. Sample DOM below

         --form (absolute, explicit height)
          +-- section container (static)
            +-- section (static)
              ......
              +-- control (static) <-- Fixed 300px height by default
                +-- grid (relative)
                  +-- grid rows (absolute) <-- Absolute rows won't auto grow so we must set height at control

         Current option: Set the grid control height to form height and let the section grow first. The diff between section and form height is then adjusted to stop the form scroll bar.
         Alternative 1: Make the grid ("div.grid") absolute and maximize (top:offSet, bottom:0) - this cause rendering behavior changes within grid control, plus scroll does not work.
         Alternative 2: Make the grid absolute and maximize (top:offSet, bottom:0) first, get the height and set explicitly - the padding/margin in the interim between grid and form hard to calculate as they will change switching absolute->relative.
         Alternative 3: Calculate the actual space the grid can take - similar as above, hard to calculate all the spacing between grid and form and fragile when any DOM changes.
         Alternative 4: Binary search try set the height on the grid and check scrollHeight>height on form - O(log(n)) cost plus browser specific issue (Chrome) scroll bar still appear when scrollHeight==height
         Alternative 5: Make the interim divs between grid and form relative and 100% height - too invasive and must only do so when there's only one adaptable control.
     * @param $control the control to adjust height on the form
     * @param minimalHeight the minimal height the control shall have
     */
    public static autoFitControlHeight($control: JQuery, minimalHeight: number = 150) {
        if ($control) {
            var $form = $control.closest("div.form-grid");
            var $sectionContainer = $control.closest("div.section-container");

            if ($form && $sectionContainer) {
                var maxHeight = $form.height(); // control height may not exceed the form height
                maxHeight = Math.max(maxHeight, minimalHeight);

                if (maxHeight > 0) {
                    // Step 1: First, set control height same as form height (which we expect mostly this would cause scroll bar for form)
                    $control.height(maxHeight);
                    var heightAdjustment = $sectionContainer.height() - maxHeight; // if this <=0 means we have no need to adjust, there's no need for a scroll bar to show.

                    if (heightAdjustment > 0) {
                        // Step 2: Then, reduce the control height as needed (calculate the max possible height for control is hard and fragile, hence adjust diff instead)
                        var height = Math.max(maxHeight - heightAdjustment, minimalHeight);
                        $control.height(height);
                    }
                }
            }
            else {
                Diag.logWarning("Cannot auto adjust the control height, either form grid or section container not found in the DOM structure");
            }
        }
    }
}

export = ControlHeightAdjustmentHelper;