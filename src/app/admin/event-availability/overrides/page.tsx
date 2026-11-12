import { Suspense } from "react";
import { OverridesContent } from "../_components/overrides-content";

export default function SpecialLimitsOverridePage() {
    return (
        <Suspense fallback={null}>
            <OverridesContent />
        </Suspense>
    );
}
