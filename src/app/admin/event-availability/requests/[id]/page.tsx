"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { RequestDetail } from "../../_components/request-detail";

export default function AllocationRequestDetailPage() {
    const { id } = useParams<{ id: string }>();
    return (
        <Suspense fallback={null}>
            <RequestDetail id={Number(id)} />
        </Suspense>
    );
}
