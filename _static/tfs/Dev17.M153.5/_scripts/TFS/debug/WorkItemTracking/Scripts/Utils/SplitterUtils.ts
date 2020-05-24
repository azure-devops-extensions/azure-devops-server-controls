
import { Splitter } from "VSS/Controls/Splitter";

export function resizeSplitter(splitter: Splitter, maxSize: number, minSize: number) {
    splitter.setMaxWidth(maxSize);
    splitter.setMinWidth(minSize);
    const size: number = splitter.getFixedSidePixels();
    // Update splitter size if it fell outside its boundaries
    if (size > maxSize) {
        splitter.resize(maxSize, true);
    } else if (size < minSize) {
        splitter.resize(minSize, true);
    }
}
